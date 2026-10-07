import type {
  AnalysisContext,
  CommitActivity,
  DependencyReport,
  HealthCategoryKey,
  HealthReport,
  ReadmeReport,
  ScoredCategory,
  TestingReport,
  CodeQualityReport,
} from '../models/types';
import { clamp, daysSince, percentOf } from '../utils/format';

interface HealthInputs {
  readme: ReadmeReport;
  testing: TestingReport;
  activity: CommitActivity;
  dependencies: DependencyReport;
  quality: CodeQualityReport;
  archived: boolean;
}

function documentationScore(readme: ReadmeReport): ScoredCategory {
  let score = 0;
  const reasons: string[] = [];

  if (readme.exists) {
    score += 40;
    reasons.push('README exists');
    if (readme.length > 2000) {
      score += 20;
      reasons.push('detailed README');
    } else if (readme.length > 500) {
      score += 10;
      reasons.push('moderate README');
    }
    if (readme.hasInstallInstructions) {
      score += 15;
      reasons.push('setup instructions');
    }
    if (readme.hasScreenshots) {
      score += 10;
      reasons.push('screenshots');
    }
    if (readme.hasEnvExample) {
      score += 5;
      reasons.push('environment example');
    }
    if (readme.sections.length >= 4) {
      score += 10;
      reasons.push(`${readme.sections.length} sections`);
    }
  } else {
    reasons.push('no README detected');
  }

  return {
    key: 'documentation',
    label: 'Documentation',
    score: clamp(score),
    explanation: reasons.join(', '),
  };
}

function testingScore(testing: TestingReport): ScoredCategory {
  let score = 0;
  const reasons: string[] = [];

  if (testing.testFileCount > 0) {
    score += 40 + Math.min(20, testing.testFileCount * 4);
    reasons.push(`${testing.testFileCount} test file(s)`);
  } else {
    reasons.push('no test files detected');
  }
  if (testing.framework) {
    score += 20;
    reasons.push(`${testing.framework} detected`);
  }
  if (testing.hasCiTesting) {
    score += 20;
    reasons.push('CI testing signal');
  }

  return {
    key: 'testing',
    label: 'Testing',
    score: clamp(score),
    explanation: reasons.join(', '),
  };
}

function maintenanceScore(activity: CommitActivity, archived: boolean): ScoredCategory {
  if (archived) {
    return {
      key: 'maintenance',
      label: 'Maintenance',
      score: 10,
      explanation: 'repository is archived',
    };
  }

  const days = daysSince(activity.lastCommitAt);
  let recency = 20;
  if (days === null) recency = 30;
  else if (days < 30) recency = 100;
  else if (days < 90) recency = 80;
  else if (days < 180) recency = 60;
  else if (days < 365) recency = 40;

  const releaseSignal = activity.releases > 0 ? 100 : 50;
  const commitSignal = activity.totalLast30Days > 0 ? 100 : 40;
  const score = Math.round(recency * 0.5 + releaseSignal * 0.2 + commitSignal * 0.3);

  const reasons: string[] = [];
  if (days !== null) reasons.push(`last commit ${Math.floor(days)}d ago`);
  reasons.push(`${activity.totalLast30Days} commits/30d`);
  reasons.push(`${activity.releases} release(s)`);

  return { key: 'maintenance', label: 'Maintenance', score: clamp(score), explanation: reasons.join(', ') };
}

function organizationScore(context: AnalysisContext, quality: CodeQualityReport): ScoredCategory {
  const top = context.tree.filter((node) => node.type === 'tree' && !node.path.includes('/'));
  const paths = context.tree.map((node) => node.path);
  const reasons: string[] = [];
  let score = 30;

  if (paths.some((path) => /^src\//.test(path) || /^apps\//.test(path) || /^components\//.test(path))) {
    score += 30;
    reasons.push('source directory present');
  } else {
    reasons.push('no conventional source directory');
  }

  if (top.length >= 3 && top.length <= 14) {
    score += 25;
    reasons.push(`${top.length} top-level entries`);
  } else if (top.length > 0) {
    score += 10;
    reasons.push(`${top.length} top-level entries`);
  }

  if (quality.largeFiles.length === 0) {
    score += 15;
    reasons.push('no oversized files');
  } else {
    score -= Math.min(20, quality.largeFiles.length * 5);
    reasons.push(`${quality.largeFiles.length} large file(s)`);
  }

  return { key: 'organization', label: 'Organization', score: clamp(score), explanation: reasons.join(', ') };
}

function ciScore(context: AnalysisContext): ScoredCategory {
  const workflows = context.tree.filter(
    (node) => node.type === 'blob' && /^\.github\/workflows\/.+\.ya?ml$/.test(node.path),
  );
  const hasCi = workflows.length > 0;

  let score = hasCi ? 70 : 15;
  const reasons = hasCi
    ? [`${workflows.length} workflow file(s)`]
    : ['no CI workflow detected'];
  if (hasCi && workflows.some((w) => /(ci|test|check|build|lint)/i.test(w.path))) {
    score += 30;
    reasons.push('test/build workflow');
  }

  return { key: 'ci', label: 'CI/CD', score: clamp(score), explanation: reasons.join(', ') };
}

function dependenciesScore(
  dependencies: DependencyReport,
  context: AnalysisContext,
): ScoredCategory {
  const reasons: string[] = [];
  let score = 0;
  const total = dependencies.production.length + dependencies.development.length;

  if (dependencies.manifestPaths.length > 0) {
    score += 40;
    reasons.push(`${dependencies.manifestPaths.length} manifest(s)`);
  } else {
    reasons.push('no dependency manifest');
  }

  const hasLockfile = context.tree.some((node) =>
    /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|composer\.lock|poetry\.lock|Pipfile\.lock|Cargo\.lock|go\.sum|Gemfile\.lock)$/.test(
      node.path,
    ),
  );
  if (hasLockfile) {
    score += 40;
    reasons.push('lockfile present');
  } else {
    reasons.push('no lockfile detected');
  }

  if (total > 0) {
    score += total <= 60 ? 20 : 10;
    reasons.push(`${total} dependencies`);
  }

  return {
    key: 'dependencies',
    label: 'Dependencies',
    score: clamp(score),
    explanation: reasons.join(', '),
  };
}

const WEIGHTS: Record<HealthCategoryKey, number> = {
  documentation: 0.2,
  testing: 0.2,
  maintenance: 0.2,
  organization: 0.15,
  ci: 0.1,
  dependencies: 0.15,
};

export function calculateHealth(
  inputs: HealthInputs,
  context: AnalysisContext,
): HealthReport {
  const categories: ScoredCategory[] = [
    documentationScore(inputs.readme),
    testingScore(inputs.testing),
    maintenanceScore(inputs.activity, inputs.archived),
    organizationScore(context, inputs.quality),
    ciScore(context),
    dependenciesScore(inputs.dependencies, context),
  ];

  const overall = Math.round(
    categories.reduce((total, category) => total + category.score * WEIGHTS[category.key], 0),
  );

  const strongest = [...categories].sort((a, b) => b.score - a.score)[0];
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];

  const summary = strongest && weakest
    ? `Strongest: ${strongest.label} (${strongest.score}). Weakest: ${weakest.label} (${weakest.score}) — ${weakest.explanation}.`
    : 'No signals available.';

  return { categories, overall, summary };
}

export function healthPercentOf(part: number, total: number): number {
  return percentOf(part, total);
}
