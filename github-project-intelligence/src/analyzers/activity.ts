import type { AnalysisContext, CommitActivity, Finding, OverviewReport } from '../models/types';
import { daysSince, formatRelative } from '../utils/format';

export function analyzeActivity(activity: CommitActivity): Finding[] {
  const findings: Finding[] = [];

  findings.push({
    title: 'Repository Activity',
    detail: [
      `Contributors: ${activity.contributors}`,
      `Last commit: ${formatRelative(activity.lastCommitAt)}`,
      `Commits (last 30 days): ${activity.totalLast30Days}`,
      `Releases: ${activity.releases}`,
      `Open PRs: ${activity.openPullRequests}`,
      `Open issues: ${activity.openIssues}`,
    ].join(' · '),
    evidence: [
      { label: 'GitHub commits API', source: '/commits' },
      { label: 'GitHub contributors API', source: '/contributors' },
    ],
    confidence: 'high',
  });

  findings.push({
    title: 'Maintenance',
    detail: activity.active
      ? 'Actively maintained: commits landed in the last 30 days.'
      : 'No commits detected in the last 30 days.',
    evidence: [{ label: `${activity.totalLast30Days} commits in 30 days`, source: '/commits' }],
    confidence: 'high',
  });

  return findings;
}

export function buildOverview(context: AnalysisContext): OverviewReport {
  const { repo, activity } = context;
  const stackNames = new Set<string>();

  for (const manifest of context.packageJson) {
    try {
      const parsed = JSON.parse(manifest.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const name of Object.keys({ ...parsed.dependencies, ...parsed.devDependencies })) {
        stackNames.add(name);
      }
    } catch {
      /* ignore */
    }
  }

  const framework = ['next', 'nuxt', 'vue', '@angular/core', 'svelte', 'react']
    .find((dep) => stackNames.has(dep))
    ?.replace('next', 'Next.js')
    .replace('nuxt', 'Nuxt')
    .replace('vue', 'Vue.js')
    .replace('@angular/core', 'Angular')
    .replace('svelte', 'Svelte')
    .replace('react', 'React') ?? null;

  const database = [
    ['mongodb', 'MongoDB'],
    ['mongoose', 'MongoDB'],
    ['pg', 'PostgreSQL'],
    ['mysql2', 'MySQL'],
    ['prisma', 'Prisma'],
    ['@prisma/client', 'Prisma'],
    ['drizzle-orm', 'Drizzle'],
    ['better-sqlite3', 'SQLite'],
  ]
    .find(([dep]) => stackNames.has(dep as string))?.[1] ?? null;

  const authentication = [
    ['better-auth', 'Better Auth'],
    ['next-auth', 'NextAuth.js'],
    ['@clerk/nextjs', 'Clerk'],
    ['passport', 'Passport.js'],
    ['jsonwebtoken', 'JWT'],
  ]
    .find(([dep]) => stackNames.has(dep as string))?.[1] ?? null;

  const days = daysSince(activity.lastCommitAt ?? repo.pushedAt);
  const status: OverviewReport['status'] = repo.archived
    ? 'archived'
    : days !== null && days < 60
      ? 'active'
      : 'dormant';

  const type = database || stackNames.has('express') || stackNames.has('fastify')
    ? 'Full-stack application'
    : framework
      ? 'Frontend application'
      : 'Software project';

  return {
    type,
    primaryLanguage: repo.language,
    framework,
    database,
    authentication,
    license: repo.license,
    status,
    lastCommitAgo: activity.lastCommitAt ? formatRelative(activity.lastCommitAt) : null,
  };
}
