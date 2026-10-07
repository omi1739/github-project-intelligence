import { describe, expect, it } from 'vitest';
import { buildReport } from '../index';
import { makeCollector } from './fixtures';

describe('buildReport', () => {
  it('produces a complete analysis report from collected data', () => {
    const report = buildReport(makeCollector(), Date.now() - 1500);

    expect(report.repo.fullName).toBe('acme/hireloop');
    expect(report.overview.framework).toBe('Next.js');
    expect(report.overview.database).toBe('MongoDB');
    expect(report.overview.authentication).toBe('Better Auth');
    expect(report.overview.status).toBe('active');
    expect(report.health.overall).toBeGreaterThan(0);
    expect(report.structure.importantFiles.length).toBeGreaterThan(0);
    expect(report.dependencies.production.length).toBeGreaterThan(0);
    expect(report.testing.framework).toBe('Vitest');
    expect(report.durationMs).toBeGreaterThanOrEqual(1500);
    expect(report.partial).toBe(false);
  });

  it('marks partial reports when the collector recorded warnings', () => {
    const report = buildReport(makeCollector({ warnings: ['No README detected.'] }));

    expect(report.partial).toBe(true);
    expect(report.warnings).toContain('No README detected.');
  });
});
