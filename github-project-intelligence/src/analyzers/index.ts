import type { AnalysisContext, AnalysisReport, CollectorResult } from '../models/types';
import { analyzeActivity, buildOverview } from './activity';
import { analyzeDependencies } from './dependencies';
import { calculateHealth } from './health';
import { analyzeQuality, qualityFindings } from './quality';
import { analyzeReadme } from './readme';
import { analyzeSecurity } from './security';
import { analyzeStructure } from './structure';
import { detectStack } from './stack';
import { analyzeTesting } from './testing';

export function buildReport(collected: CollectorResult, startedAt = Date.now()): AnalysisReport {
  const context: AnalysisContext = {
    repo: collected.repo,
    tree: collected.tree,
    readme: collected.readme,
    packageJson: collected.packageJson,
    fileContents: collected.fileContents,
    activity: collected.activity,
    raw: { contents: {} },
  };

  const stack = detectStack(context);
  const structure = analyzeStructure(context);
  const readme = analyzeReadme(context);
  const dependencies = analyzeDependencies(context);
  const testing = analyzeTesting(context);
  const security = analyzeSecurity(context);
  const quality = analyzeQuality(context);
  const overview = buildOverview(context);

  const health = calculateHealth(
    {
      readme,
      testing,
      activity: collected.activity,
      dependencies,
      quality,
      archived: collected.repo.archived,
    },
    context,
  );

  return {
    repo: collected.repo,
    overview,
    stack,
    structure,
    readme,
    activity: collected.activity,
    dependencies,
    testing,
    security,
    quality,
    health,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    warnings: collected.warnings,
    partial: collected.warnings.length > 0,
  };
}

export { analyzeActivity, qualityFindings };
