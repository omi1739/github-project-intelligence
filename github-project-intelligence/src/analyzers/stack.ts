import type {
  AnalysisContext,
  Confidence,
  Finding,
  TechEntry,
} from '../models/types';

interface DepRule {
  dep: string;
  name: string;
  category: keyof StackCategoriesInput;
  confidence?: Confidence;
}

interface StackCategoriesInput {
  frontend: TechEntry[];
  backend: TechEntry[];
  database: TechEntry[];
  authentication: TechEntry[];
  testing: TechEntry[];
  tooling: TechEntry[];
  deployment: TechEntry[];
}

export type StackCategory = keyof StackCategoriesInput;

const DEP_RULES: DepRule[] = [
  { dep: 'react', name: 'React', category: 'frontend' },
  { dep: 'next', name: 'Next.js', category: 'frontend' },
  { dep: 'vue', name: 'Vue.js', category: 'frontend' },
  { dep: 'nuxt', name: 'Nuxt', category: 'frontend' },
  { dep: 'svelte', name: 'Svelte', category: 'frontend' },
  { dep: '@sveltejs/kit', name: 'SvelteKit', category: 'frontend' },
  { dep: '@angular/core', name: 'Angular', category: 'frontend' },
  { dep: 'solid-js', name: 'SolidJS', category: 'frontend' },
  { dep: 'tailwindcss', name: 'Tailwind CSS', category: 'frontend' },
  { dep: 'bootstrap', name: 'Bootstrap', category: 'frontend' },
  { dep: 'styled-components', name: 'styled-components', category: 'frontend' },

  { dep: 'express', name: 'Express', category: 'backend' },
  { dep: 'fastify', name: 'Fastify', category: 'backend' },
  { dep: '@nestjs/core', name: 'NestJS', category: 'backend' },
  { dep: 'koa', name: 'Koa', category: 'backend' },
  { dep: 'hono', name: 'Hono', category: 'backend' },

  { dep: 'mongodb', name: 'MongoDB', category: 'database' },
  { dep: 'mongoose', name: 'Mongoose', category: 'database' },
  { dep: 'pg', name: 'PostgreSQL', category: 'database' },
  { dep: 'mysql2', name: 'MySQL', category: 'database' },
  { dep: 'prisma', name: 'Prisma', category: 'database' },
  { dep: '@prisma/client', name: 'Prisma', category: 'database' },
  { dep: 'drizzle-orm', name: 'Drizzle ORM', category: 'database' },
  { dep: 'sequelize', name: 'Sequelize', category: 'database' },
  { dep: 'better-sqlite3', name: 'SQLite', category: 'database' },
  { dep: 'sqlite3', name: 'SQLite', category: 'database' },
  { dep: 'redis', name: 'Redis', category: 'database' },
  { dep: 'ioredis', name: 'Redis', category: 'database' },
  { dep: 'supabase', name: 'Supabase', category: 'database' },
  { dep: '@supabase/supabase-js', name: 'Supabase', category: 'database' },
  { dep: 'firebase-admin', name: 'Firebase', category: 'database' },

  { dep: 'better-auth', name: 'Better Auth', category: 'authentication' },
  { dep: 'next-auth', name: 'NextAuth.js', category: 'authentication' },
  { dep: '@auth/core', name: 'Auth.js', category: 'authentication' },
  { dep: '@clerk/nextjs', name: 'Clerk', category: 'authentication' },
  { dep: 'passport', name: 'Passport.js', category: 'authentication' },
  { dep: 'jsonwebtoken', name: 'JWT', category: 'authentication' },
  { dep: 'jose', name: 'JOSE/JWT', category: 'authentication' },
  { dep: 'firebase-auth', name: 'Firebase Auth', category: 'authentication' },

  { dep: 'jest', name: 'Jest', category: 'testing' },
  { dep: 'vitest', name: 'Vitest', category: 'testing' },
  { dep: '@playwright/test', name: 'Playwright', category: 'testing' },
  { dep: 'playwright', name: 'Playwright', category: 'testing' },
  { dep: 'cypress', name: 'Cypress', category: 'testing' },
  { dep: 'mocha', name: 'Mocha', category: 'testing' },
  { dep: '@testing-library/react', name: 'Testing Library', category: 'testing' },

  { dep: 'typescript', name: 'TypeScript', category: 'tooling' },
  { dep: 'eslint', name: 'ESLint', category: 'tooling' },
  { dep: 'prettier', name: 'Prettier', category: 'tooling' },
  { dep: 'vite', name: 'Vite', category: 'tooling' },
  { dep: 'webpack', name: 'Webpack', category: 'tooling' },
  { dep: 'husky', name: 'Husky', category: 'tooling' },
  { dep: 'lint-staged', name: 'lint-staged', category: 'tooling' },
  { dep: 'zod', name: 'Zod', category: 'tooling' },

  { dep: 'vercel', name: 'Vercel', category: 'deployment' },
  { dep: 'netlify', name: 'Netlify', category: 'deployment' },
  { dep: '@aws-sdk/client-s3', name: 'AWS S3', category: 'deployment' },
];

interface FileRule {
  test: RegExp;
  name: string;
  category: StackCategory;
  confidence?: Confidence;
}

const FILE_RULES: FileRule[] = [
  { test: /(^|\/)next\.config\.(js|ts|mjs|cjs)$/, name: 'Next.js', category: 'frontend' },
  { test: /(^|\/)nuxt\.config\.(js|ts)$/, name: 'Nuxt', category: 'frontend' },
  { test: /(^|\/)vue\.config\.(js|ts)$/, name: 'Vue CLI', category: 'frontend' },
  { test: /(^|\/)vite\.config\.(js|ts)$/, name: 'Vite', category: 'tooling' },
  { test: /(^|\/)webpack\.config\.(js|ts)$/, name: 'Webpack', category: 'tooling' },
  { test: /(^|\/)tailwind\.config\.(js|ts|cjs|mjs)$/, name: 'Tailwind CSS', category: 'frontend' },
  { test: /(^|\/)Dockerfile$/, name: 'Docker', category: 'deployment' },
  { test: /(^|\/)docker-compose\.(yml|yaml)$/, name: 'Docker Compose', category: 'deployment' },
  { test: /^\.github\/workflows\/.+\.ya?ml$/, name: 'GitHub Actions', category: 'tooling' },
  { test: /(^|\/)vercel\.json$/, name: 'Vercel', category: 'deployment' },
  { test: /(^|\/)netlify\.toml$/, name: 'Netlify', category: 'deployment' },
  { test: /(^|\/)fly\.toml$/, name: 'Fly.io', category: 'deployment' },
  { test: /(^|\/)render\.yaml$/, name: 'Render', category: 'deployment' },
  { test: /(^|\/)prisma\/schema\.prisma$/, name: 'Prisma', category: 'database' },
  { test: /(^|\/)requirements\.txt$/, name: 'Python', category: 'backend' },
  { test: /(^|\/)pyproject\.toml$/, name: 'Python', category: 'backend' },
  { test: /(^|\/)pom\.xml$/, name: 'Maven/Java', category: 'backend' },
  { test: /(^|\/)build\.gradle$/, name: 'Gradle/Java', category: 'backend' },
  { test: /(^|\/)go\.mod$/, name: 'Go', category: 'backend' },
  { test: /(^|\/)Cargo\.toml$/, name: 'Rust', category: 'backend' },
  { test: /(^|\/)composer\.json$/, name: 'PHP', category: 'backend' },
  { test: /(^|\/)gemfile$/i, name: 'Ruby', category: 'backend' },
  { test: /(^|\/)\.env\.example$/, name: 'Environment config', category: 'tooling' },
  { test: /(^|\/)playwright\.config\.(js|ts)$/, name: 'Playwright', category: 'testing' },
  { test: /(^|\/)jest\.config\.(js|ts|mjs|cjs)$/, name: 'Jest', category: 'testing' },
  { test: /(^|\/)vitest\.config\.(js|ts)$/, name: 'Vitest', category: 'testing' },
  { test: /(^|\/)cypress\/.+/, name: 'Cypress', category: 'testing' },
];

function emptyCategories(): StackCategoriesInput {
  return {
    frontend: [],
    backend: [],
    database: [],
    authentication: [],
    testing: [],
    tooling: [],
    deployment: [],
  };
}

function pushUnique(list: TechEntry[], entry: TechEntry): void {
  const existing = list.find((item) => item.name === entry.name);
  if (!existing) {
    list.push(entry);
    return;
  }
  existing.evidence.push(...entry.evidence);
  if (entry.confidence === 'high') existing.confidence = 'high';
}

export function detectStack(context: AnalysisContext): StackCategoriesInput {
  const categories = emptyCategories();
  const manifests = context.packageJson;

  for (const manifest of manifests) {
    let parsed: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    try {
      parsed = JSON.parse(manifest.content);
    } catch {
      continue;
    }

    const all = [
      ...Object.keys(parsed.dependencies ?? {}).map(
        (dep) => [dep, 'production'] as const,
      ),
      ...Object.keys(parsed.devDependencies ?? {}).map(
        (dep) => [dep, 'development'] as const,
      ),
    ];

    for (const [dep, scope] of all) {
      const rule = DEP_RULES.find((candidate) => candidate.dep === dep);
      if (!rule) continue;
      pushUnique(categories[rule.category], {
        name: rule.name,
        category: rule.category,
        evidence: [{ label: `${dep} (${scope})`, source: manifest.path }],
        confidence: rule.confidence ?? 'high',
      });
    }
  }

  for (const rule of FILE_RULES) {
    const matches = context.tree.filter((node) => node.type === 'blob' && rule.test.test(node.path));
    if (matches.length === 0) continue;
    pushUnique(categories[rule.category], {
      name: rule.name,
      category: rule.category,
      evidence: matches.slice(0, 3).map((node) => ({ label: node.path, source: 'file tree' })),
      confidence: rule.confidence ?? 'medium',
    });
  }

  return categories;
}

export function toFindings(stack: StackCategoriesInput): Finding[] {
  const labels: Record<StackCategory, string> = {
    frontend: 'Frontend',
    backend: 'Backend',
    database: 'Database',
    authentication: 'Authentication',
    testing: 'Testing',
    tooling: 'Tooling',
    deployment: 'Deployment',
  };

  return (Object.keys(labels) as StackCategory[])
    .filter((key) => stack[key].length > 0)
    .map((key) => ({
      title: labels[key],
      detail: stack[key].map((entry) => entry.name).join(', '),
      evidence: stack[key].flatMap((entry) => entry.evidence.slice(0, 2)),
      confidence: stack[key].every((entry) => entry.confidence === 'high')
        ? ('high' as Confidence)
        : ('medium' as Confidence),
    }));
}
