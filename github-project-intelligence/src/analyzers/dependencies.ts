import type { AnalysisContext, DependencyReport, ParsedDependency } from '../models/types';

function detectPackageManager(paths: string[]): DependencyReport['packageManager'] {
  if (paths.includes('pnpm-lock.yaml')) return 'pnpm';
  if (paths.includes('yarn.lock')) return 'yarn';
  if (paths.includes('package-lock.json')) return 'npm';
  return 'unknown';
}

export function analyzeDependencies(context: AnalysisContext): DependencyReport {
  const production: ParsedDependency[] = [];
  const development: ParsedDependency[] = [];
  const seen = new Set<string>();

  for (const manifest of context.packageJson) {
    let parsed: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    try {
      parsed = JSON.parse(manifest.content);
    } catch {
      continue;
    }

    for (const [name, version] of Object.entries(parsed.dependencies ?? {})) {
      const key = `prod:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      production.push({ name, version, scope: 'production' });
    }
    for (const [name, version] of Object.entries(parsed.devDependencies ?? {})) {
      const key = `dev:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      development.push({ name, version, scope: 'development' });
    }
  }

  production.sort((a, b) => a.name.localeCompare(b.name));
  development.sort((a, b) => a.name.localeCompare(b.name));

  return {
    packageManager: detectPackageManager(context.tree.map((node) => node.path)),
    production,
    development,
    manifestPaths: context.packageJson.map((manifest) => manifest.path),
  };
}
