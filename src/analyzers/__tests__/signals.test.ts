import { describe, expect, it } from 'vitest';
import { analyzeSecurity } from '../security';
import { analyzeStructure } from '../structure';
import { analyzeQuality } from '../quality';
import { analyzeReadme } from '../readme';
import { redactSecrets, countSecretLikeMatches } from '../../utils/redact';
import { parseRepoPath } from '../../utils/repoPath';
import { makeContext } from './fixtures';

describe('analyzeSecurity', () => {
  it('flags committed .env files and passes .gitignore', () => {
    const context = makeContext({
      tree: [
        ...makeContext().tree,
        { path: '.env', type: 'blob', size: 100 },
        { path: '.env.example', type: 'blob', size: 80 },
      ],
    });

    const report = analyzeSecurity(context);
    const envCheck = report.checks.find((check) => check.label.includes('.env file'));

    expect(envCheck?.status).toBe('fail');
    expect(report.checks.find((check) => check.label.includes('.gitignore'))?.status).toBe('pass');
    expect(report.findings.some((finding) => finding.title.includes('Environment file'))).toBe(true);
  });

  it('detects secret-like patterns locally without exposing values', () => {
    const report = analyzeSecurity(makeContext());
    const secretCheck = report.checks.find((check) => check.label.includes('secret-like'));

    expect(secretCheck?.status).toBe('warn');
    expect(JSON.stringify(report)).not.toContain('abc123secret');
  });
});

describe('analyzeStructure', () => {
  it('infers a layered architecture from services, api and models directories', () => {
    const report = analyzeStructure(makeContext());

    expect(report.architecture.label).toContain('layered');
    expect(report.architecture.confidence).toBe('medium');
    expect(report.importantFiles.map((file) => file.path)).toEqual(
      expect.arrayContaining(['README.md', 'package.json', 'src/app/layout.tsx']),
    );
    expect(report.groups.map((group) => group.label)).toEqual(
      expect.arrayContaining(['Frontend / UI', 'Services / business logic', 'Data / models']),
    );
  });

  it('detects monorepos', () => {
    const report = analyzeStructure(
      makeContext({
        tree: [
          { path: 'apps', type: 'tree' },
          { path: 'packages', type: 'tree' },
        ],
      }),
    );

    expect(report.architecture.label).toContain('Monorepo');
    expect(report.architecture.confidence).toBe('high');
  });
});

describe('analyzeQuality', () => {
  it('finds large files and TODO/FIXME counts in sampled sources', () => {
    const report = analyzeQuality(makeContext());

    expect(report.largeFiles.some((file) => file.path === 'src/app/huge.ts')).toBe(true);
    expect(report.todoCount).toBeGreaterThanOrEqual(1);
    expect(report.scannedFiles).toBeGreaterThan(0);
  });
});

describe('analyzeReadme', () => {
  it('extracts sections and documentation signals', () => {
    const report = analyzeReadme(makeContext());

    expect(report.exists).toBe(true);
    expect(report.sections).toEqual(expect.arrayContaining(['Installation', 'API']));
    expect(report.hasInstallInstructions).toBe(true);
    expect(report.hasScreenshots).toBe(true);
    expect(report.summary).toContain('job marketplace');
  });

  it('handles a missing README', () => {
    const report = analyzeReadme(makeContext({ readme: null }));

    expect(report.exists).toBe(false);
    expect(report.summary).toBeNull();
  });
});

describe('redaction', () => {
  it('redacts tokens and key assignments', () => {
    const redacted = redactSecrets('token=abcdef1234567890 ghp_abcdefghijklmnopqrstuvwx');

    expect(redacted).not.toContain('abcdef1234567890');
    expect(redacted).not.toContain('ghp_');
    expect(redacted).toContain('[REDACTED]');
  });

  it('counts secret-like matches', () => {
    expect(countSecretLikeMatches('API_KEY=12345678 SECRET="abcdefgh"')).toBeGreaterThanOrEqual(2);
  });
});

describe('parseRepoPath', () => {
  it('parses repository URLs', () => {
    expect(parseRepoPath('/facebook/react')).toEqual({
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
    });
    expect(parseRepoPath('/owner/repo/tree/main/src')).toEqual({
      owner: 'owner',
      name: 'repo',
      fullName: 'owner/repo',
    });
  });

  it('rejects non-repository routes', () => {
    expect(parseRepoPath('/settings')).toBeNull();
    expect(parseRepoPath('/topics/javascript')).toBeNull();
    expect(parseRepoPath('/notifications')).toBeNull();
    expect(parseRepoPath('/')).toBeNull();
  });
});
