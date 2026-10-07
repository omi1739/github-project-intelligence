import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalysisReport, ReportTab } from '../models/types';
import { AnalysisError, analyzeRepository, readCachedReport } from '../services/analysis';
import { parseRepoPath, type RepoRef } from '../utils/repoPath';
import { EmptyState, Spinner } from './components/ui';
import {
  ActivitySection,
  ArchitectureSection,
  TechnologiesSection,
} from './components/sections/ArchitectureSection';
import {
  DependenciesSection,
  QualitySection,
  SecuritySection,
  TestingSection,
} from './components/sections/CodeSections';
import { OverviewSection } from './components/sections/OverviewSection';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'technologies', label: 'Technologies' },
  { id: 'activity', label: 'Activity' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'testing', label: 'Testing' },
  { id: 'quality', label: 'Quality' },
  { id: 'security', label: 'Security' },
];

async function getActiveRepo(): Promise<RepoRef | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url) return null;
  try {
    return parseRepoPath(new URL(tab.url).pathname);
  } catch {
    return null;
  }
}

export default function App() {
  const [repo, setRepo] = useState<RepoRef | null>(null);
  const [checked, setChecked] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [tab, setTab] = useState<ReportTab>('overview');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [rateLimit, setRateLimit] = useState<number | null>(null);

  const refreshRepo = useCallback(async () => {
    const ref = await getActiveRepo();
    setRepo(ref);
    setChecked(true);
    if (ref) {
      const existing = await readCachedReport(ref.owner, ref.name);
      setReport(existing);
      setCached(Boolean(existing));
      setError(null);
      setTab((current) => current);
    } else {
      setReport(null);
      setCached(false);
    }
  }, []);

  useEffect(() => {
    void refreshRepo();

    const onActivated = () => void refreshRepo();
    const onUpdated = (
      _tabId: number,
      info: { url?: string; status?: string },
    ) => {
      if (info.url || info.status === 'complete') void refreshRepo();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [refreshRepo]);

  const runAnalysis = useCallback(
    async (force: boolean) => {
      if (!repo) return;
      setLoading(true);
      setError(null);
      setProgress('Starting…');
      try {
        const result = await analyzeRepository(repo.owner, repo.name, {
          force,
          onProgress: setProgress,
        });
        setReport(result.report);
        setCached(result.cached);
        setRateLimit(result.rateLimitRemaining);
      } catch (err) {
        setError(
          err instanceof AnalysisError ? err.message : (err as Error).message || 'Analysis failed.',
        );
      } finally {
        setLoading(false);
        setProgress('');
      }
    },
    [repo],
  );

  const content = useMemo(() => {
    if (!checked) return <Spinner label="Detecting repository…" />;
    if (!repo)
      return (
        <EmptyState
          title="No GitHub repository open"
          body="Open a repository page on github.com — for example github.com/facebook/react — and the Analyze button will appear."
        />
      );
    if (loading) return <div className="p-3"><Spinner label={progress || 'Analyzing…'} /></div>;
    if (error)
      return (
        <div className="flex flex-col gap-3">
          <EmptyState title="Analysis failed" body={error} />
          <button
            type="button"
            onClick={() => void runAnalysis(true)}
            className="rounded-md bg-[#238636] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#2ea043]"
          >
            Try again
          </button>
        </div>
      );
    if (!report)
      return (
        <EmptyState
          title={repo.fullName}
          body="Run an analysis to get the technology stack, structure, health score, activity and security signals for this repository."
        />
      );

    switch (tab) {
      case 'overview':
        return <OverviewSection report={report} />;
      case 'architecture':
        return <ArchitectureSection report={report} />;
      case 'technologies':
        return <TechnologiesSection report={report} />;
      case 'activity':
        return <ActivitySection report={report} />;
      case 'dependencies':
        return <DependenciesSection report={report} />;
      case 'testing':
        return <TestingSection report={report} />;
      case 'quality':
        return <QualitySection report={report} />;
      case 'security':
        return <SecuritySection report={report} />;
      default:
        return null;
    }
  }, [checked, repo, loading, progress, error, report, tab, runAnalysis]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[#30363d] bg-[#161b22] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-[13px] font-semibold text-[#e6edf3]">
              GitHub Project Intelligence
            </h1>
            <p className="truncate text-[11px] text-[#8b949e]">
              {repo ? repo.fullName : 'no repository detected'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => chrome.runtime.openOptionsPage()}
              title="Options"
              className="rounded border border-[#30363d] bg-[#21262d] px-2 py-1 text-[11px] text-[#8b949e] hover:border-[#58a6ff] hover:text-[#58a6ff]"
            >
              Options
            </button>
            <button
              type="button"
              onClick={() => void runAnalysis(true)}
              disabled={!repo || loading}
              className="rounded bg-[#238636] px-2.5 py-1 text-[11px] font-semibold text-white enabled:hover:bg-[#2ea043] disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : report ? 'Re-analyze' : 'Analyze Repository'}
            </button>
          </div>
        </div>
        {report ? (
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#6e7681]">
            <span>{cached ? 'cached report' : `analyzed in ${(report.durationMs / 1000).toFixed(1)}s`}</span>
            <span>·</span>
            <span>{new Date(report.analyzedAt).toLocaleTimeString()}</span>
            {rateLimit !== null ? (
              <>
                <span>·</span>
                <span>API budget {rateLimit}</span>
              </>
            ) : null}
          </div>
        ) : null}
      </header>

      {report ? (
        <nav className="flex gap-1 overflow-x-auto border-b border-[#30363d] bg-[#0d1117] px-2 py-1.5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                tab === item.id
                  ? 'bg-[#1f6feb] text-white'
                  : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="flex-1 overflow-y-auto p-3">{content}</main>
    </div>
  );
}
