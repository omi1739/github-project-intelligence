import { describe, expect, it } from 'vitest';
import { detectStack, toFindings } from '../stack';
import { makeContext } from './fixtures';

describe('detectStack', () => {
  it('detects frontend, backend, database and tooling from package.json', () => {
    const stack = detectStack(makeContext());

    expect(stack.frontend.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['React', 'Next.js', 'Tailwind CSS']),
    );
    expect(stack.database.map((entry) => entry.name)).toContain('MongoDB');
    expect(stack.authentication.map((entry) => entry.name)).toContain('Better Auth');
    expect(stack.testing.map((entry) => entry.name)).toContain('Vitest');
    expect(stack.tooling.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['TypeScript', 'ESLint', 'Prettier']),
    );
  });

  it('records evidence with source paths and high confidence for manifest matches', () => {
    const stack = detectStack(makeContext());
    const next = stack.frontend.find((entry) => entry.name === 'Next.js');

    expect(next?.confidence).toBe('high');
    expect(next?.evidence[0]?.source).toBe('package.json');
  });

  it('detects technologies from file rules when no manifest matches', () => {
    const stack = detectStack(
      makeContext({
        packageJson: [],
        fileContents: new Map(),
        tree: [{ path: 'Dockerfile', type: 'blob', size: 100 }],
      }),
    );

    expect(stack.deployment.map((entry) => entry.name)).toContain('Docker');
  });

  it('produces findings grouped by category', () => {
    const findings = toFindings(detectStack(makeContext()));
    expect(findings.map((finding) => finding.title)).toContain('Frontend');
  });
});
