import type {
  AnalysisContext,
  Evidence,
  StructureGroup,
  StructureReport,
} from '../models/types';

const GROUP_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'Frontend / UI', pattern: /(^|\/)(components|pages|app|views|screens|layouts|styles|public)$/ },
  { label: 'API routes', pattern: /(^|\/)(api|routes|controllers|endpoints)$/ },
  { label: 'Services / business logic', pattern: /(^|\/)(services|lib|hooks|use|domain|use-cases)$/ },
  { label: 'Data / models', pattern: /(^|\/)(models|prisma|database|db|migrations|entities|schemas)$/ },
  { label: 'Authentication', pattern: /(^|\/)(auth|authentication|authorization)$/ },
  { label: 'Tests', pattern: /(^|\/)(tests?|__tests__|specs?|e2e|cypress)$/ },
  { label: 'Configuration', pattern: /(^|\/)(config|configs|scripts|\.github)$/ },
  { label: 'Utilities', pattern: /(^|\/)(utils?|helpers|common|shared|constants)$/ },
  { label: 'Backend / server', pattern: /(^|\/)(server|backend)$/ },
  { label: 'Documentation', pattern: /(^|\/)(docs?|documentation)$/ },
];

const IMPORTANT_FILE_RULES: { path: RegExp; reason: string }[] = [
  { path: /(^|\/)README\.md$/i, reason: 'Project overview and setup instructions.' },
  { path: /(^|\/)package\.json$/, reason: 'Reveals the technology stack and scripts.' },
  { path: /(^|\/)src\/app\/layout\.(tsx|jsx|ts|js)$/, reason: 'Root layout of the application shell.' },
  { path: /(^|\/)src\/app\/page\.(tsx|jsx|ts|js)$/, reason: 'Primary entry route.' },
  { path: /(^|\/)(src\/)?index\.(tsx|jsx|ts|js)$/, reason: 'Application entry point.' },
  { path: /(^|\/)(src\/)?main\.(tsx|jsx|ts|js)$/, reason: 'Application entry point.' },
  { path: /(^|\/)src\/App\.(tsx|jsx)$/, reason: 'Root component.' },
  { path: /(^|\/)prisma\/schema\.prisma$/, reason: 'Database schema definition.' },
  { path: /(^|\/)docker-compose\.ya?ml$/, reason: 'Service topology and local environment.' },
  { path: /(^|\/)\.env\.example$/, reason: 'Required environment variables.' },
  { path: /(^|\/)server\.(js|ts)$/, reason: 'Server entry point.' },
  { path: /(^|\/)src\/server\/?/, reason: 'Server-side application code.' },
];

function detectArchitecture(context: AnalysisContext): StructureReport['architecture'] {
  const paths = context.tree.map((node) => node.path);
  const evidence: Evidence[] = [];
  const has = (pattern: RegExp) => paths.some((path) => pattern.test(path));

  const layeredSignals = [
    { pattern: /(^|\/)services(\/|$)/, label: 'src/services/' },
    { pattern: /(^|\/)(api|routes|controllers)(\/|$)/, label: 'api routes' },
    { pattern: /(^|\/)(models|prisma|entities)(\/|$)/, label: 'data models' },
  ];
  const layeredHits = layeredSignals.filter((signal) => has(signal.pattern));

  const componentSignals = [
    { pattern: /(^|\/)components(\/|$)/, label: 'components/' },
    { pattern: /(^|\/)hooks(\/|$)/, label: 'hooks/' },
    { pattern: /(^|\/)(pages|app)(\/|$)/, label: 'routes/pages' },
  ];
  const componentHits = componentSignals.filter((signal) => has(signal.pattern));

  const monorepo = has(/^apps(\/|$)/) && has(/^packages(\/|$)/);
  const mvc =
    has(/(^|\/)controllers(\/|$)/) &&
    has(/(^|\/)views?(\/|$)/) &&
    has(/(^|\/)models(\/|$)/);

  if (monorepo) {
    for (const path of ['apps/', 'packages/']) evidence.push({ label: path, source: 'file tree' });
    return { label: 'Monorepo (apps + packages)', confidence: 'high', evidence };
  }
  if (mvc) {
    for (const path of ['controllers/', 'views/', 'models/']) {
      evidence.push({ label: path, source: 'file tree' });
    }
    return { label: 'MVC-style architecture', confidence: 'medium', evidence };
  }
  if (layeredHits.length >= 2) {
    for (const hit of layeredHits) evidence.push({ label: hit.label, source: 'file tree' });
    return { label: 'Likely layered architecture', confidence: 'medium', evidence };
  }
  if (componentHits.length >= 2) {
    for (const hit of componentHits) evidence.push({ label: hit.label, source: 'file tree' });
    return { label: 'Component-based frontend architecture', confidence: 'medium', evidence };
  }
  if (paths.length > 0) {
    evidence.push({ label: 'flat or unconventional layout', source: 'file tree' });
    return { label: 'Unclassified structure', confidence: 'low', evidence };
  }
  return { label: 'Unknown', confidence: 'low', evidence };
}

export function analyzeStructure(context: AnalysisContext): StructureReport {
  const topDirectories = [
    ...new Set(
      context.tree
        .filter((node) => node.type === 'tree' && !node.path.includes('/'))
        .map((node) => node.path),
    ),
  ].sort();

  const groups: StructureGroup[] = GROUP_PATTERNS.map(({ label, pattern }) => ({
    label,
    paths: [
      ...new Set(context.tree.filter((node) => node.type === 'tree' && pattern.test(node.path)).map((n) => n.path)),
    ].slice(0, 8),
  })).filter((group) => group.paths.length > 0);

  const importantFiles = IMPORTANT_FILE_RULES.map((rule) => {
    const match = context.tree.find((node) => node.type === 'blob' && rule.path.test(node.path));
    return match ? { path: match.path, reason: rule.reason } : null;
  }).filter((entry): entry is { path: string; reason: string } => entry !== null);

  const architecture = detectArchitecture(context);

  const groupLabels = groups.map((group) => group.label.toLowerCase()).join(', ');
  const narrative =
    groups.length > 0
      ? `The repository groups code into ${groupLabels}. Architecture inference: ${architecture.label.toLowerCase()} (${architecture.confidence} confidence).`
      : 'The repository does not expose a recognizable directory grouping yet.';

  return { topDirectories, groups, architecture, importantFiles, narrative };
}
