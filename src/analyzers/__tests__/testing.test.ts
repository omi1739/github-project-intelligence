import { describe, expect, it } from 'vitest';
import { analyzeTesting } from '../testing';
import { analyzeDependencies } from '../dependencies';
import { makeContext } from './fixtures';

describe('analyzeTesting', () => {
  it('detects framework, test files and CI signals', () => {
    const report = analyzeTesting(makeContext());

    expect(report.framework).toBe('Vitest');
    expect(report.testFileCount).toBeGreaterThanOrEqual(1);
    expect(report.testDirectories).toContain('src/__tests__');
    expect(report.hasCiTesting).toBe(true);
    expect(report.status).toBe('good');
  });

  it('reports missing status when nothing is found', () => {
    const report = analyzeTesting(
      makeContext({ tree: [{ path: 'index.js', type: 'blob', size: 10 }], packageJson: [] }),
    );

    expect(report.framework).toBeNull();
    expect(report.testFileCount).toBe(0);
    expect(report.status).toBe('missing');
  });

  it('detects *.spec.ts style test files', () => {
    const report = analyzeTesting(
      makeContext({
        tree: [{ path: 'src/service.spec.ts', type: 'blob', size: 100 }],
        packageJson: [],
      }),
    );

    expect(report.testFileCount).toBe(1);
    expect(report.status).toBe('partial');
  });
});

describe('analyzeDependencies', () => {
  it('splits production and development dependencies', () => {
    const report = analyzeDependencies(makeContext());

    expect(report.production.map((dep) => dep.name)).toEqual(
      expect.arrayContaining(['next', 'react', 'mongodb']),
    );
    expect(report.development.map((dep) => dep.name)).toEqual(
      expect.arrayContaining(['typescript', 'vitest']),
    );
    expect(report.packageManager).toBe('npm');
  });

  it('detects pnpm from the lockfile', () => {
    const report = analyzeDependencies(
      makeContext({
        tree: [
          { path: 'package.json', type: 'blob', size: 10 },
          { path: 'pnpm-lock.yaml', type: 'blob', size: 10 },
        ],
      }),
    );

    expect(report.packageManager).toBe('pnpm');
  });

  it('ignores malformed manifests', () => {
    const report = analyzeDependencies(
      makeContext({ packageJson: [{ path: 'package.json', content: '{ not json' }] }),
    );

    expect(report.production).toHaveLength(0);
    expect(report.development).toHaveLength(0);
  });
});
