import type { AnalysisContext, DependencyReport, ParsedDependency } from '../models/types';
import { detectManifestKind, parseManifestDeps } from '../utils/manifest';

function detectPackageManager(paths: string[]): DependencyReport['packageManager'] {
  if (paths.some((path) => /(^|\/)pnpm-lock\.yaml$/.test(path))) return 'pnpm';
  if (paths.some((path) => /(^|\/)yarn\.lock$/.test(path))) return 'yarn';
  if (paths.some((path) => /(^|\/)package-lock\.json$/.test(path))) return 'npm';
  if (paths.some((path) => /(^|\/)composer\.lock$/.test(path))) return 'composer';
  if (paths.some((path) => /(^|\/)(Pipfile\.lock|poetry\.lock)$/.test(path))) return 'pip';
  if (paths.some((path) => /(^|\/)Gemfile\.lock$/.test(path))) return 'bundler';
  if (paths.some((path) => /(^|\/)go\.sum$/.test(path))) return 'go';
  if (paths.some((path) => /(^|\/)Cargo\.lock$/.test(path))) return 'cargo';
  return 'unknown';
}

export function analyzeDependencies(context: AnalysisContext): DependencyReport {
  const production: ParsedDependency[] = [];
  const development: ParsedDependency[] = [];
  const seen = new Set<string>();

  for (const manifest of context.packageJson) {
    const kind = manifest.kind ?? detectManifestKind(manifest.path);
    if (kind === 'unknown') continue;

    const deps = parseManifestDeps(manifest.path, manifest.content);

    for (const dep of deps.production) {
      const key = `prod:${dep.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      production.push({ name: dep.name, version: dep.version, scope: 'production' });
    }
    for (const dep of deps.development) {
      const key = `dev:${dep.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      development.push({ name: dep.name, version: dep.version, scope: 'development' });
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
