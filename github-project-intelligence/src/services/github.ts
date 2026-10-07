import type {
  CommitActivity,
  CollectorResult,
  PackageJsonFile,
  RepoMeta,
  TreeNode,
} from '../models/types';

const API = 'https://api.github.com';

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimited = false,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

interface RequestOptions {
  token?: string;
  accept?: string;
}

let rateLimitRemaining: number | null = null;

export function getRateLimitRemaining(): number | null {
  return rateLimitRemaining;
}

async function gh<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: options.accept ?? 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'github-project-intelligence',
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API}${path}`, { headers });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) rateLimitRemaining = Number(remaining);

  if (!res.ok) {
    const rateLimited = res.status === 403 && remaining === '0';
    const isRepoLookup = /^\/repos\/[^/]+\/[^/]+/.test(path);
    let message: string;
    if (res.status === 404 && isRepoLookup) {
      const fullName = path.match(/^\/repos\/([^/]+\/[^/]+)/)?.[1] ?? '';
      message = `Repository "${fullName}" was not found (404). Check the URL — if it is a private repository, add a GitHub token in Options.`;
    } else if (res.status === 401) {
      message = 'GitHub rejected the configured token (401). Check it in Options.';
    } else if (rateLimited) {
      message = 'GitHub API rate limit reached. Add a personal access token in Options.';
    } else {
      message = `GitHub API error ${res.status} for ${path}`;
    }
    throw new GitHubApiError(message, res.status, rateLimited);
  }
  return (await res.json()) as T;
}

function toMeta(owner: string, name: string, raw: Record<string, unknown>): RepoMeta {
  return {
    owner,
    name,
    fullName: String(raw.full_name ?? `${owner}/${name}`),
    description: (raw.description as string | null) ?? null,
    defaultBranch: String(raw.default_branch ?? 'main'),
    language: (raw.language as string | null) ?? null,
    stargazersCount: Number(raw.stargazers_count ?? 0),
    forksCount: Number(raw.forks_count ?? 0),
    openIssuesCount: Number(raw.open_issues_count ?? 0),
    license: (raw.license as { spdx_id?: string } | null)?.spdx_id ?? null,
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
    pushedAt: String(raw.pushed_at ?? ''),
    archived: Boolean(raw.archived),
    isPrivate: Boolean(raw.private),
    topics: Array.isArray(raw.topics) ? (raw.topics as string[]) : [],
    homepage: (raw.homepage as string | null) ?? null,
  };
}

export async function fetchRepo(
  owner: string,
  name: string,
  token?: string,
): Promise<RepoMeta> {
  const raw = await gh<Record<string, unknown>>(`/repos/${owner}/${name}`, { token });
  return toMeta(owner, name, raw);
}

export async function fetchTree(
  repo: RepoMeta,
  token?: string,
): Promise<TreeNode[]> {
  const data = await gh<{ tree?: TreeNode[] }>(
    `/repos/${repo.owner}/${repo.name}/git/trees/${encodeURIComponent(repo.defaultBranch)}?recursive=1`,
    { token },
  );
  const tree = data.tree ?? [];
  return tree
    .filter((node) => (node.type === 'blob' || node.type === 'tree') && !node.path?.startsWith('.git/'))
    .map((node) => ({ path: node.path, type: node.type, size: node.size }));
}

async function fetchFileText(
  owner: string,
  name: string,
  path: string,
  token?: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${name}/HEAD/${encodeURI(path)}`,
      {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'User-Agent': 'github-project-intelligence' }
          : { 'User-Agent': 'github-project-intelligence' },
      },
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const PACKAGE_MANIFESTS = [
  'package.json',
  'backend/package.json',
  'server/package.json',
  'api/package.json',
  'apps/web/package.json',
  'web/package.json',
  'client/package.json',
];

async function fetchPackageManifests(
  repo: RepoMeta,
  tree: TreeNode[],
  token?: string,
): Promise<PackageJsonFile[]> {
  const wanted = new Set(PACKAGE_MANIFESTS);
  const extra = tree
    .filter((n) => n.type === 'blob' && /(^|\/)package\.json$/.test(n.path))
    .map((n) => n.path)
    .filter((p) => !p.includes('node_modules'));
  const paths = [...new Set([...extra, ...wanted])].filter((p) =>
    tree.length === 0 ? wanted.has(p) : tree.some((n) => n.path === p),
  );

  const results = await Promise.all(
    paths.slice(0, 6).map(async (path) => {
      const content = await fetchFileText(repo.owner, repo.name, path, token);
      return content ? { path, content } : null;
    }),
  );
  return results.filter((r): r is PackageJsonFile => r !== null);
}

async function fetchReadme(
  repo: RepoMeta,
  token?: string,
): Promise<string | null> {
  const candidates = ['README.md', 'readme.md', 'README.MD', 'docs/README.md'];
  for (const candidate of candidates) {
    const text = await fetchFileText(repo.owner, repo.name, candidate, token);
    if (text) return text;
  }
  return null;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchActivity(
  repo: RepoMeta,
  token?: string,
): Promise<CommitActivity> {
  const since = daysAgoIso(30);

  const [commits, contributors, releases, pulls, issues, languages] =
    await Promise.allSettled([
      gh<unknown[]>(`/repos/${repo.owner}/${repo.name}/commits?per_page=100&since=${since}`, {
        token,
      }),
      gh<unknown[]>(`/repos/${repo.owner}/${repo.name}/contributors?per_page=100`, { token }),
      gh<unknown[]>(`/repos/${repo.owner}/${repo.name}/releases?per_page=100`, { token }),
      gh<{ total_count: number }>(
        `/repos/${repo.owner}/${repo.name}/pulls?state=open&per_page=1`,
        { token },
      ),
      gh<{ total_count: number }>(
        `/repos/${repo.owner}/${repo.name}/issues?state=open&per_page=1`,
        { token },
      ),
      gh<Record<string, number>>(`/repos/${repo.owner}/${repo.name}/languages`, { token }),
    ]);

  const commitList = commits.status === 'fulfilled' ? (commits.value as unknown[]) : [];
  const contributorList =
    contributors.status === 'fulfilled' ? (contributors.value as unknown[]) : [];
  const releaseList = releases.status === 'fulfilled' ? (releases.value as unknown[]) : [];

  const lastCommit = commitList[0] as
    | { commit?: { author?: { date?: string } } }
    | undefined;

  return {
    totalLast30Days: commitList.length,
    lastCommitAt:
      lastCommit?.commit?.author?.date ??
      (repo.pushedAt ? new Date(repo.pushedAt).toISOString() : null),
    contributors: contributorList.length || Math.max(1, contributorList.length),
    releases: releaseList.length,
    openPullRequests: pulls.status === 'fulfilled' ? pulls.value.total_count : 0,
    openIssues: issues.status === 'fulfilled' ? issues.value.total_count : 0,
    languages:
      languages.status === 'fulfilled' && typeof languages.value === 'object'
        ? languages.value
        : {},
    active: commitList.length > 0,
  };
}

const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.cpp',
  '.c',
  '.vue',
  '.svelte',
];

const EXCLUDED_SOURCE_PATTERN = /(node_modules|dist|build|vendor|min\.js|\.d\.ts|\.lock)/;

async function fetchSampleSourceFiles(
  repo: RepoMeta,
  tree: TreeNode[],
  token?: string,
  limit = 10,
): Promise<Map<string, string>> {
  const candidates = tree
    .filter(
      (node) =>
        node.type === 'blob' &&
        SOURCE_EXTENSIONS.some((ext) => node.path.endsWith(ext)) &&
        !EXCLUDED_SOURCE_PATTERN.test(node.path) &&
        (node.size ?? 0) > 0 &&
        (node.size ?? 0) < 200_000,
    )
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, limit);

  const contents = await Promise.all(
    candidates.map(async (node) => {
      const text = await fetchFileText(repo.owner, repo.name, node.path, token);
      return text ? ([node.path, text] as const) : null;
    }),
  );

  const map = new Map<string, string>();
  for (const entry of contents) {
    if (entry) map.set(entry[0], entry[1]);
  }
  return map;
}

export interface CollectOptions {
  token?: string;
  onProgress?: (step: string) => void;
}

export async function collectRepository(
  owner: string,
  name: string,
  options: CollectOptions = {},
): Promise<CollectorResult> {
  const { token, onProgress } = options;
  const warnings: string[] = [];

  onProgress?.('Repository metadata');
  const repo = await fetchRepo(owner, name, token);

  onProgress?.('File tree');
  let tree: TreeNode[] = [];
  try {
    tree = await fetchTree(repo, token);
  } catch (error) {
    warnings.push(`Could not read the file tree: ${(error as Error).message}`);
  }

  onProgress?.('Activity');
  let activity: CommitActivity = {
    totalLast30Days: 0,
    lastCommitAt: repo.pushedAt || null,
    contributors: 0,
    releases: 0,
    openPullRequests: 0,
    openIssues: repo.openIssuesCount,
    languages: {},
    active: false,
  };
  try {
    activity = await fetchActivity(repo, token);
  } catch (error) {
    warnings.push(`Could not read activity: ${(error as Error).message}`);
  }

  onProgress?.('README, manifests and source samples');
  const [readme, packageJson, sourceSamples] = await Promise.all([
    fetchReadme(repo, token).catch(() => null),
    fetchPackageManifests(repo, tree, token).catch(() => []),
    fetchSampleSourceFiles(repo, tree, token).catch(() => new Map<string, string>()),
  ]);

  if (!readme) warnings.push('No README detected.');
  if (packageJson.length === 0) warnings.push('No package.json manifest detected.');

  const fileContents = new Map<string, string>();
  for (const pkg of packageJson) fileContents.set(pkg.path, pkg.content);
  for (const [path, text] of sourceSamples) fileContents.set(path, text);

  return { repo, tree, readme, packageJson, fileContents, activity, warnings };
}
