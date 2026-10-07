import type {
  AnalysisContext,
  CollectorResult,
  CommitActivity,
  RepoMeta,
  TreeNode,
} from '../../models/types';

export const baseRepo: RepoMeta = {
  owner: 'acme',
  name: 'hireloop',
  fullName: 'acme/hireloop',
  description: 'A job marketplace',
  defaultBranch: 'main',
  language: 'TypeScript',
  stargazersCount: 2400,
  forksCount: 312,
  openIssuesCount: 12,
  license: 'MIT',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  pushedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  archived: false,
  isPrivate: false,
  topics: ['nextjs'],
  homepage: null,
};

export const activeActivity: CommitActivity = {
  totalLast30Days: 47,
  lastCommitAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  contributors: 12,
  releases: 8,
  openPullRequests: 4,
  openIssues: 12,
  languages: { TypeScript: 8000, CSS: 2000 },
  active: true,
};

export const tree: TreeNode[] = [
  { path: 'README.md', type: 'blob', size: 4000 },
  { path: 'package.json', type: 'blob', size: 1200 },
  { path: 'package-lock.json', type: 'blob', size: 9000 },
  { path: 'next.config.js', type: 'blob', size: 300 },
  { path: 'tailwind.config.ts', type: 'blob', size: 300 },
  { path: '.gitignore', type: 'blob', size: 200 },
  { path: '.github', type: 'tree' },
  { path: '.github/workflows/ci.yml', type: 'blob', size: 500 },
  { path: 'src', type: 'tree' },
  { path: 'src/app', type: 'tree' },
  { path: 'src/app/layout.tsx', type: 'blob', size: 800 },
  { path: 'src/app/page.tsx', type: 'blob', size: 1500 },
  { path: 'src/components', type: 'tree' },
  { path: 'src/components/Button.tsx', type: 'blob', size: 400 },
  { path: 'src/services', type: 'tree' },
  { path: 'src/services/userService.ts', type: 'blob', size: 2000 },
  { path: 'src/models', type: 'tree' },
  { path: 'src/models/User.ts', type: 'blob', size: 300 },
  { path: 'src/__tests__', type: 'tree' },
  { path: 'src/__tests__/user.test.ts', type: 'blob', size: 600 },
  { path: 'prisma/schema.prisma', type: 'blob', size: 900 },
  { path: 'src/app/huge.ts', type: 'blob', size: 400_000 },
];

export const packageJson = {
  path: 'package.json',
  content: JSON.stringify({
    scripts: { dev: 'next dev', test: 'vitest run', lint: 'eslint .' },
    dependencies: {
      next: '16.0.0',
      react: '19.0.0',
      'better-auth': '1.0.0',
      mongodb: '7.0.0',
    },
    devDependencies: {
      typescript: '5.9.0',
      vitest: '3.0.0',
      eslint: '9.0.0',
      prettier: '3.0.0',
      tailwindcss: '4.0.0',
    },
  }),
};

export const readme = `# HireLoop

A job marketplace connecting job seekers, recruiters and administrators.

## Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Environment variables

Copy .env.example and fill in the values.

![screenshot](./docs/screenshot.png)

## API

Endpoints live under /api.
`;

export function makeContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  const fileContents = new Map<string, string>([
    [packageJson.path, packageJson.content],
    ['src/services/userService.ts', '// TODO: split this file\nconst API_KEY = "abc123secret";'],
  ]);

  return {
    repo: baseRepo,
    tree,
    readme,
    packageJson: [packageJson],
    fileContents,
    activity: activeActivity,
    raw: { contents: {} },
    ...overrides,
  };
}

export function makeCollector(
  overrides: Partial<CollectorResult> = {},
): CollectorResult {
  const context = makeContext();
  return {
    repo: context.repo,
    tree: context.tree,
    readme: context.readme,
    packageJson: context.packageJson,
    fileContents: context.fileContents,
    activity: context.activity,
    warnings: [],
    ...overrides,
  };
}
