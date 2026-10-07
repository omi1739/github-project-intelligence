export type Confidence = 'high' | 'medium' | 'low';

export interface Evidence {
  label: string;
  source?: string;
}

export interface Finding {
  title: string;
  detail?: string;
  evidence: Evidence[];
  confidence: Confidence;
}

export interface ScoredCategory {
  key: HealthCategoryKey;
  label: string;
  score: number;
  explanation: string;
}

export interface HealthReport {
  categories: ScoredCategory[];
  overall: number;
  summary: string;
}

export type HealthCategoryKey =
  | 'documentation'
  | 'testing'
  | 'maintenance'
  | 'organization'
  | 'ci'
  | 'dependencies';

export interface TreeNode {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  size?: number;
}

export interface RepoMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  license: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived: boolean;
  isPrivate: boolean;
  topics: string[];
  homepage: string | null;
}

export interface CommitActivity {
  totalLast30Days: number;
  lastCommitAt: string | null;
  contributors: number;
  releases: number;
  openPullRequests: number;
  openIssues: number;
  languages: Record<string, number>;
  active: boolean;
}

export interface ParsedDependency {
  name: string;
  version: string;
  scope: 'production' | 'development';
}

export interface DependencyReport {
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  production: ParsedDependency[];
  development: ParsedDependency[];
  manifestPaths: string[];
}

export interface TestingReport {
  framework: string | null;
  testFileCount: number;
  testDirectories: string[];
  hasCiTesting: boolean;
  status: 'good' | 'partial' | 'missing';
  evidence: Evidence[];
}

export interface SecurityReport {
  checks: SecurityCheck[];
  findings: Finding[];
}

export interface SecurityCheck {
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'unknown';
  detail?: string;
}

export interface CodeQualityReport {
  largeFiles: { path: string; size: number }[];
  todoCount: number;
  fixmeCount: number;
  scannedFiles: number;
  notes: string[];
}

export interface ReadmeReport {
  exists: boolean;
  length: number;
  sections: string[];
  hasInstallInstructions: boolean;
  hasScreenshots: boolean;
  hasEnvExample: boolean;
  summary: string | null;
}

export interface TechEntry {
  name: string;
  category: string;
  evidence: Evidence[];
  confidence: Confidence;
}

export interface StackReport {
  frontend: TechEntry[];
  backend: TechEntry[];
  database: TechEntry[];
  authentication: DevToolEntry[];
  testing: TechEntry[];
  tooling: TechEntry[];
  deployment: TechEntry[];
}

export interface DevToolEntry {
  name: string;
  evidence: Evidence[];
  confidence: Confidence;
}

export interface StructureReport {
  topDirectories: string[];
  groups: StructureGroup[];
  architecture: { label: string; confidence: Confidence; evidence: Evidence[] };
  importantFiles: { path: string; reason: string }[];
  narrative: string;
}

export interface StructureGroup {
  label: string;
  paths: string[];
}

export interface OverviewReport {
  type: string;
  primaryLanguage: string | null;
  framework: string | null;
  database: string | null;
  authentication: string | null;
  license: string | null;
  status: 'active' | 'dormant' | 'archived';
  lastCommitAgo: string | null;
}

export interface AnalysisReport {
  repo: RepoMeta;
  overview: OverviewReport;
  stack: StackReport;
  structure: StructureReport;
  readme: ReadmeReport;
  activity: CommitActivity;
  dependencies: DependencyReport;
  testing: TestingReport;
  security: SecurityReport;
  quality: CodeQualityReport;
  health: HealthReport;
  analyzedAt: string;
  durationMs: number;
  warnings: string[];
  partial: boolean;
}

export type ReportTab =
  | 'overview'
  | 'architecture'
  | 'technologies'
  | 'quality'
  | 'security'
  | 'activity'
  | 'dependencies'
  | 'testing'
  | 'ai';

export type ProviderId = 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface AiSettings {
  enabled: boolean;
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ExtensionSettings {
  githubToken: string;
  cacheTtlMinutes: number;
  ai: AiSettings;
}

export interface AnalysisContext {
  repo: RepoMeta;
  tree: TreeNode[];
  readme: string | null;
  packageJson: PackageJsonFile[];
  fileContents: Map<string, string>;
  activity: CommitActivity;
  raw: {
    contents: Record<string, unknown>;
  };
}

export interface PackageJsonFile {
  path: string;
  content: string;
}

export interface CollectorResult {
  repo: RepoMeta;
  tree: TreeNode[];
  readme: string | null;
  packageJson: PackageJsonFile[];
  fileContents: Map<string, string>;
  activity: CommitActivity;
  warnings: string[];
}
