import type { AnalysisContext, CommitActivity, Finding, OverviewReport } from '../models/types';
import { daysSince, formatRelative } from '../utils/format';
import { parseManifestDeps } from '../utils/manifest';

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
    const deps = parseManifestDeps(manifest.path, manifest.content);
    for (const dep of [...deps.production, ...deps.development]) {
      stackNames.add(dep.name);
    }
  }

  const framework = [
    ['next', 'Next.js'],
    ['nuxt', 'Nuxt'],
    ['vue', 'Vue.js'],
    ['@angular/core', 'Angular'],
    ['svelte', 'Svelte'],
    ['react', 'React'],
    ['laravel/framework', 'Laravel'],
    ['symfony/symfony', 'Symfony'],
    ['django', 'Django'],
    ['flask', 'Flask'],
    ['fastapi', 'FastAPI'],
    ['rails', 'Ruby on Rails'],
    ['spring-boot', 'Spring Boot'],
  ]
    .find(([dep]) => stackNames.has(dep as string))
    ?.[1] ?? null;

  const database = [
    ['mongodb', 'MongoDB'],
    ['mongoose', 'MongoDB'],
    ['pg', 'PostgreSQL'],
    ['psycopg2', 'PostgreSQL'],
    ['mysql2', 'MySQL'],
    ['pymysql', 'MySQL'],
    ['prisma', 'Prisma'],
    ['@prisma/client', 'Prisma'],
    ['drizzle-orm', 'Drizzle'],
    ['better-sqlite3', 'SQLite'],
    ['doctrine/orm', 'Doctrine ORM'],
    ['sqlalchemy', 'SQLAlchemy'],
  ]
    .find(([dep]) => stackNames.has(dep as string))?.[1] ?? null;

  const authentication = [
    ['better-auth', 'Better Auth'],
    ['next-auth', 'NextAuth.js'],
    ['@clerk/nextjs', 'Clerk'],
    ['passport', 'Passport.js'],
    ['jsonwebtoken', 'JWT'],
    ['laravel/sanctum', 'Laravel Sanctum'],
  ]
    .find(([dep]) => stackNames.has(dep as string))?.[1] ?? null;

  const days = daysSince(activity.lastCommitAt ?? repo.pushedAt);
  const status: OverviewReport['status'] = repo.archived
    ? 'archived'
    : days !== null && days < 60
      ? 'active'
      : 'dormant';

  const serverSide =
    stackNames.has('express') ||
    stackNames.has('fastify') ||
    stackNames.has('@nestjs/core') ||
    stackNames.has('laravel/framework') ||
    stackNames.has('django') ||
    stackNames.has('flask') ||
    stackNames.has('fastapi') ||
    stackNames.has('rails');

  const backendLanguage = ['PHP', 'Python', 'Ruby', 'Java', 'Go', 'C#'].includes(
    repo.language ?? '',
  );

  const type = database || serverSide
    ? 'Full-stack application'
    : framework
      ? 'Frontend application'
      : backendLanguage
        ? 'Backend / server-rendered application'
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
