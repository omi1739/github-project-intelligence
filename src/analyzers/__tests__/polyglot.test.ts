import { describe, expect, it } from 'vitest';
import type { RepoMeta, TreeNode } from '../../models/types';
import { buildOverview } from '../activity';
import { analyzeDependencies } from '../dependencies';
import { analyzeQuality } from '../quality';
import { analyzeStructure } from '../structure';
import { detectStack } from '../stack';
import { analyzeTesting } from '../testing';
import { baseRepo, makeContext } from './fixtures';

const phpRepo: RepoMeta = { ...baseRepo, language: 'PHP', fullName: 'acme/elearning' };

const phpTree: TreeNode[] = [
  { path: 'README.md', type: 'blob', size: 2000 },
  { path: 'index.php', type: 'blob', size: 900 },
  { path: 'composer.json', type: 'blob', size: 400 },
  { path: 'composer.lock', type: 'blob', size: 4000 },
  { path: 'phpunit.xml.dist', type: 'blob', size: 300 },
  { path: 'config', type: 'tree' },
  { path: 'config/app.php', type: 'blob', size: 500 },
  { path: 'includes', type: 'tree' },
  { path: 'includes/auth.php', type: 'blob', size: 1200 },
  { path: 'database', type: 'tree' },
  { path: 'database/schema.sql', type: 'blob', size: 3000 },
  { path: 'student', type: 'tree' },
  { path: 'student/dashboard.php', type: 'blob', size: 800 },
  { path: 'instructor', type: 'tree' },
  { path: 'instructor/courses.php', type: 'blob', size: 800 },
  { path: 'tests', type: 'tree' },
  { path: 'tests/LoginTest.php', type: 'blob', size: 600 },
  { path: 'assets', type: 'tree' },
  { path: 'assets/vendor', type: 'tree' },
  { path: 'assets/vendor/bootstrap/bootstrap.min.css', type: 'blob', size: 250_000 },
  { path: 'src', type: 'tree' },
  { path: 'src/huge.php', type: 'blob', size: 300_000 },
];

const composerJson = {
  path: 'composer.json',
  kind: 'composer' as const,
  content: JSON.stringify({
    require: { php: '^8.1', 'laravel/framework': '^11.0', 'doctrine/orm': '^3.0' },
    'require-dev': { 'phpunit/phpunit': '^11.0', phpstan: '^2.0' },
  }),
};

describe('multi-language repositories', () => {
  it('parses composer.json into production and development dependencies', () => {
    const report = analyzeDependencies(
      makeContext({ tree: phpTree, repo: phpRepo, packageJson: [composerJson] }),
    );

    expect(report.production.map((dep) => dep.name)).toEqual([
      'doctrine/orm',
      'laravel/framework',
    ]);
    expect(report.development.map((dep) => dep.name)).toEqual(
      expect.arrayContaining(['phpunit/phpunit', 'phpstan']),
    );
    expect(report.packageManager).toBe('composer');
    expect(report.manifestPaths).toEqual(['composer.json']);
  });

  it('parses requirements.txt and splits dev-only Python packages', () => {
    const report = analyzeDependencies(
      makeContext({
        tree: [
          { path: 'requirements.txt', type: 'blob', size: 200 },
          { path: 'poetry.lock', type: 'blob', size: 900 },
        ],
        packageJson: [
          {
            path: 'requirements.txt',
            kind: 'python',
            content: '# deps\nfastapi==0.115.0\npytest==8.3.0\n',
          },
        ],
      }),
    );

    expect(report.production.map((dep) => dep.name)).toEqual(['fastapi']);
    expect(report.development.map((dep) => dep.name)).toEqual(['pytest']);
    expect(report.packageManager).toBe('pip');
  });

  it('detects PHP, Laravel and PHPUnit from manifests and file rules', () => {
    const stack = detectStack(
      makeContext({ tree: phpTree, repo: phpRepo, packageJson: [composerJson] }),
    );

    expect(stack.backend.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['PHP', 'Laravel']),
    );
    expect(stack.database.map((entry) => entry.name)).toContain('Doctrine ORM');
    expect(stack.testing.map((entry) => entry.name)).toContain('PHPUnit');
    expect(stack.database.map((entry) => entry.name)).toContain('SQL');
  });

  it('classifies a classic PHP layout and surfaces feature modules', () => {
    const report = analyzeStructure(
      makeContext({ tree: phpTree, repo: phpRepo, packageJson: [composerJson] }),
    );

    expect(report.architecture.label).toBe('Server-rendered PHP application');

    const featureModules = report.groups.find((group) => group.label === 'Feature modules');
    expect(featureModules?.paths).toEqual(expect.arrayContaining(['student', 'instructor']));

    const appCode = report.groups.find((group) => group.label === 'Application code');
    expect(appCode?.paths).toContain('includes');
  });

  it('excludes vendored minified assets from large file findings', () => {
    const report = analyzeQuality(
      makeContext({ tree: phpTree, repo: phpRepo, packageJson: [] }),
    );

    const paths = report.largeFiles.map((file) => file.path);
    expect(paths).toContain('src/huge.php');
    expect(paths).not.toContain('assets/vendor/bootstrap/bootstrap.min.css');
  });

  it('detects PHPUnit and PHP test files', () => {
    const report = analyzeTesting(
      makeContext({ tree: phpTree, repo: phpRepo, packageJson: [] }),
    );

    expect(report.framework).toBe('PHPUnit');
    expect(report.testFileCount).toBeGreaterThanOrEqual(1);
    expect(report.status).toBe('good');
  });

  it('labels overview type for backend-language projects', () => {
    const overview = buildOverview(
      makeContext({ tree: phpTree, repo: phpRepo, packageJson: [composerJson] }),
    );

    expect(overview.type).toBe('Full-stack application');
    expect(overview.framework).toBe('Laravel');
    expect(overview.primaryLanguage).toBe('PHP');
  });
});
