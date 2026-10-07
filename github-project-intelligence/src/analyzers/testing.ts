import type { AnalysisContext, Evidence, TestingReport } from '../models/types';
import { parseManifestDeps } from '../utils/manifest';

const FRAMEWORK_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Vitest', pattern: /(^|\/)vitest\.config\.(js|ts)$/ },
  { name: 'Jest', pattern: /(^|\/)jest\.config\.(js|ts|mjs|cjs)$/ },
  { name: 'Playwright', pattern: /(^|\/)playwright\.config\.(js|ts)$/ },
  { name: 'Cypress', pattern: /(^|\/)cypress\/(e2e|integration|fixtures)\// },
  { name: 'Mocha', pattern: /(^|\/)\.mocharc\.(js|json|ya?ml)$/ },
  { name: 'PHPUnit', pattern: /(^|\/)phpunit\.xml(\.dist)?$/ },
  { name: 'Pest', pattern: /(^|\/)Pest\.php$/ },
  { name: 'pytest', pattern: /(^|\/)(pytest\.ini|conftest\.py)$/ },
  { name: 'Tox', pattern: /(^|\/)tox\.ini$/ },
  { name: 'RSpec', pattern: /(^|\/)\.rspec$/ },
  { name: 'Go test suite', pattern: /(^|\/)\w+_test\.(go)$/ },
];

const FRAMEWORK_DEPS: { name: string; label: string }[] = [
  { name: 'vitest', label: 'Vitest' },
  { name: 'jest', label: 'Jest' },
  { name: '@playwright/test', label: 'Playwright' },
  { name: 'playwright', label: 'Playwright' },
  { name: 'cypress', label: 'Cypress' },
  { name: 'mocha', label: 'Mocha' },
  { name: 'phpunit/phpunit', label: 'PHPUnit' },
  { name: 'pestphp/pest', label: 'Pest' },
  { name: 'behat/behat', label: 'Behat' },
  { name: 'pytest', label: 'pytest' },
  { name: 'rspec', label: 'RSpec' },
];

const TEST_FILE_PATTERN =
  /(^|\/)(__tests__|tests?|specs?)\/.+\.(ts|tsx|js|jsx|py|java|go|rb|php|cs)$|\.(test|spec)\.(ts|tsx|js|jsx)$|(^|\/)\w+Test\.(php|cs|rb|java)$|(^|\/)[\w.-]+_test\.(py|php|rb)$/i;

const TEST_DIR_PATTERN = /(^|\/)(tests?|__tests__|test_|.*_test|specs?)$/;

const CI_TEST_PATTERN = /(^|\/)\.github\/workflows\/.*(ci|test|check|build).*\.ya?ml$/i;

function hasTestScript(context: AnalysisContext): boolean {
  return context.packageJson.some((manifest) => {
    if (manifest.path.endsWith('requirements.txt')) return false;
    try {
      const parsed = JSON.parse(manifest.content) as { scripts?: Record<string, string> };
      return Object.entries(parsed.scripts ?? {}).some(
        ([name, command]) =>
          (name === 'test' || name.startsWith('test:')) &&
          typeof command === 'string' &&
          !/no test specified/i.test(command),
      );
    } catch {
      return false;
    }
  });
}

export function analyzeTesting(context: AnalysisContext): TestingReport {
  const evidence: Evidence[] = [];
  const paths = context.tree.map((node) => node.path);

  let framework: string | null = null;
  for (const rule of FRAMEWORK_PATTERNS) {
    if (paths.some((path) => rule.pattern.test(path))) {
      framework = rule.name;
      evidence.push({ label: rule.pattern.source, source: 'file tree' });
      break;
    }
  }

  if (!framework) {
    for (const manifest of context.packageJson) {
      const deps = parseManifestDeps(manifest.path, manifest.content);
      const names = [...deps.production, ...deps.development].map((dep) => dep.name);
      const match = FRAMEWORK_DEPS.find((candidate) => names.includes(candidate.name));
      if (match) {
        framework = match.label;
        evidence.push({ label: match.name, source: manifest.path });
        break;
      }
    }
  }

  const testFiles = context.tree.filter(
    (node) => node.type === 'blob' && TEST_FILE_PATTERN.test(node.path),
  );
  const testDirectories = [
    ...new Set(context.tree.filter((node) => node.type === 'tree' && TEST_DIR_PATTERN.test(node.path)).map((n) => n.path)),
  ];

  for (const file of testFiles.slice(0, 5)) {
    evidence.push({ label: file.path, source: 'file tree' });
  }

  const hasCiTesting =
    paths.some((path) => CI_TEST_PATTERN.test(path)) || hasTestScript(context);

  if (hasCiTesting) evidence.push({ label: 'test script or CI workflow detected', source: 'scripts' });

  const status: TestingReport['status'] =
    testFiles.length > 0 && (framework || hasCiTesting)
      ? 'good'
      : testFiles.length > 0 || framework || hasCiTesting
        ? 'partial'
        : 'missing';

  return {
    framework,
    testFileCount: testFiles.length,
    testDirectories: testDirectories.slice(0, 6),
    hasCiTesting,
    status,
    evidence,
  };
}
