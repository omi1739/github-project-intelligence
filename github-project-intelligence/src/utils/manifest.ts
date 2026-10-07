export type ManifestKind = 'npm' | 'composer' | 'python' | 'unknown';

export interface ManifestDependency {
  name: string;
  version: string;
}

export interface ManifestDeps {
  production: ManifestDependency[];
  development: ManifestDependency[];
}

const PYTHON_DEV_PREFIXES = [
  'pytest',
  'tox',
  'black',
  'flake8',
  'mypy',
  'ruff',
  'pylint',
  'coverage',
  'bandit',
];

export function detectManifestKind(path: string): ManifestKind {
  const name = path.split('/').pop()?.toLowerCase() ?? '';
  if (name === 'package.json') return 'npm';
  if (name === 'composer.json') return 'composer';
  if (name === 'requirements.txt' || name.startsWith('requirements')) return 'python';
  return 'unknown';
}

function parseNpm(content: string): ManifestDeps {
  const parsed = JSON.parse(content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return {
    production: Object.entries(parsed.dependencies ?? {}).map(([name, version]) => ({
      name,
      version,
    })),
    development: Object.entries(parsed.devDependencies ?? {}).map(([name, version]) => ({
      name,
      version,
    })),
  };
}

function parseComposer(content: string): ManifestDeps {
  const parsed = JSON.parse(content) as {
    require?: Record<string, string>;
    'require-dev'?: Record<string, string>;
  };
  const filter = (entries: [string, string][]) =>
    entries
      .filter(([name]) => name !== 'php' && !name.startsWith('ext-'))
      .map(([name, version]) => ({ name, version }));
  return {
    production: filter(Object.entries(parsed.require ?? {})),
    development: filter(Object.entries(parsed['require-dev'] ?? {})),
  };
}

function parseRequirements(content: string): ManifestDeps {
  const production: ManifestDependency[] = [];
  const development: ManifestDependency[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;
    const match = line.match(/^([A-Za-z0-9._-]+)\s*(.*)$/);
    if (!match) continue;
    const name = match[1] ?? line;
    const version = match[2] || 'unpinned';
    const target = PYTHON_DEV_PREFIXES.some((prefix) =>
      name.toLowerCase().startsWith(prefix),
    )
      ? development
      : production;
    target.push({ name, version });
  }

  return { production, development };
}

export function parseManifestDeps(path: string, content: string): ManifestDeps {
  const kind = detectManifestKind(path);
  try {
    if (kind === 'npm') return parseNpm(content);
    if (kind === 'composer') return parseComposer(content);
    if (kind === 'python') return parseRequirements(content);
  } catch {
    return { production: [], development: [] };
  }
  return { production: [], development: [] };
}
