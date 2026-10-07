import type { AnalysisReport } from '../models/types';
import { buildReport } from '../analyzers';
import { collectRepository, getRateLimitRemaining, GitHubApiError } from './github';
import { getSettings, readCache, writeCache } from './storage';

export interface AnalyzeOptions {
  force?: boolean;
  onProgress?: (step: string) => void;
}

export interface AnalyzeResult {
  report: AnalysisReport;
  cached: boolean;
  rateLimitRemaining: number | null;
}

export class AnalysisError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AnalysisError';
  }
}

function cacheKey(owner: string, name: string): string {
  return `${owner.toLowerCase()}/${name.toLowerCase()}`;
}

export async function analyzeRepository(
  owner: string,
  name: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const settings = await getSettings();
  const key = cacheKey(owner, name);

  if (!options.force) {
    const cached = await readCache<AnalysisReport>(key);
    if (cached) {
      options.onProgress?.('Using cached report');
      return { report: cached, cached: true, rateLimitRemaining: getRateLimitRemaining() };
    }
  }

  try {
    const startedAt = Date.now();
    const collected = await collectRepository(owner, name, {
      token: settings.githubToken || undefined,
      onProgress: options.onProgress,
    });

    options.onProgress?.('Running analysis engine');
    const report = buildReport(collected, startedAt);
    await writeCache(key, report, settings.cacheTtlMinutes);

    return { report, cached: false, rateLimitRemaining: getRateLimitRemaining() };
  } catch (error) {
    if (error instanceof GitHubApiError) throw new AnalysisError(error.message, error);
    throw new AnalysisError((error as Error).message || 'Analysis failed.', error);
  }
}

export async function readCachedReport(
  owner: string,
  name: string,
): Promise<AnalysisReport | null> {
  return readCache<AnalysisReport>(cacheKey(owner, name));
}
