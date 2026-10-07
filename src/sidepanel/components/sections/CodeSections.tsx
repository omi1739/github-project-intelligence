import type { AnalysisReport } from '../../../models/types';
import { Card, ConfidenceBadge, EvidenceList, Pill } from '../ui';

export function DependenciesSection({ report }: { report: AnalysisReport }) {
  const { dependencies } = report;

  return (
    <div className="flex flex-col gap-3">
      <Card
        title="Dependencies"
        right={<Pill tone="neutral">{dependencies.packageManager}</Pill>}
      >
        <p className="mb-2 text-[11px] text-[#8b949e]">
          Manifests: {dependencies.manifestPaths.join(', ') || 'none'}
        </p>
        <DependencyList title="Production" items={dependencies.production} />
        <DependencyList title="Development" items={dependencies.development} />
      </Card>

      <Card title="Dependency Status">
        <p className="text-[12px] leading-relaxed text-[#8b949e]">
          Version freshness is not checked in this build. Run your package manager's audit/outdated
          command locally, or connect a registry integration in a later version.
        </p>
      </Card>
    </div>
  );
}

function DependencyList({
  title,
  items,
}: {
  title: string;
  items: { name: string; version: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-semibold tracking-wide text-[#8b949e] uppercase">
        {title} ({items.length})
      </div>
      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {items.map((item) => (
          <span
            key={item.name}
            className="rounded border border-[#30363d] bg-[#0d1117] px-1.5 py-0.5 text-[10px] text-[#c9d1d9]"
            title={item.version}
          >
            {item.name} <span className="text-[#6e7681]">{item.version}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TestingSection({ report }: { report: AnalysisReport }) {
  const { testing } = report;
  const tone = testing.status === 'good' ? 'good' : testing.status === 'partial' ? 'warn' : 'bad';

  return (
    <div className="flex flex-col gap-3">
      <Card title="Testing" right={<Pill tone={tone}>{testing.status}</Pill>}>
        <p className="mb-2 text-[12px] text-[#c9d1d9]">
          Framework:{' '}
          <span className="font-semibold text-[#e6edf3]">{testing.framework ?? 'not detected'}</span>
        </p>
        <ul className="flex flex-col gap-1 text-[12px] text-[#c9d1d9]">
          <li>Test files detected: {testing.testFileCount}</li>
          <li>Test directories: {testing.testDirectories.join(', ') || 'none'}</li>
          <li>CI testing signal: {testing.hasCiTesting ? 'yes' : 'no'}</li>
        </ul>
        <EvidenceList items={testing.evidence} />
      </Card>

      <Card title="How this was measured">
        <p className="text-[11px] leading-relaxed text-[#8b949e]">
          Test files are matched against common patterns such as <code>*.test.ts</code>,{' '}
          <code>*.spec.ts</code> and <code>__tests__/</code>. Coverage numbers are never claimed
          without real coverage data.
        </p>
      </Card>
    </div>
  );
}

export function QualitySection({ report }: { report: AnalysisReport }) {
  const { quality } = report;

  return (
    <div className="flex flex-col gap-3">
      <Card title="Code Signals">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Pill tone={quality.largeFiles.length > 0 ? 'warn' : 'good'}>
            {quality.largeFiles.length} large files
          </Pill>
          <Pill tone={quality.todoCount > 20 ? 'warn' : 'neutral'}>{quality.todoCount} TODO</Pill>
          <Pill tone={quality.fixmeCount > 5 ? 'bad' : 'neutral'}>{quality.fixmeCount} FIXME</Pill>
        </div>
        <ul className="flex flex-col gap-1 text-[11px] text-[#8b949e]">
          {quality.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </Card>

      <Card title="Large Files">
        {quality.largeFiles.length === 0 ? (
          <p className="text-[12px] text-[#8b949e]">No unusually large source files detected.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {quality.largeFiles.map((file) => (
              <li key={file.path} className="flex items-center justify-between gap-2">
                <code className="truncate text-[11px] text-[#c9d1d9]">{file.path}</code>
                <span className="shrink-0 text-[10px] text-[#8b949e]">
                  {Math.round(file.size / 1024)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recommendation">
        <p className="text-[12px] leading-relaxed text-[#c9d1d9]">
          {quality.largeFiles.length > 0
            ? 'Consider splitting the largest files into smaller, single-responsibility modules.'
            : 'File sizes look reasonable. Keep an eye on TODO/FIXME accumulation.'}
        </p>
      </Card>
    </div>
  );
}

export function SecuritySection({ report }: { report: AnalysisReport }) {
  const { security } = report;

  const icons = {
    pass: { symbol: 'âœ“', className: 'text-[#3fb950]' },
    warn: { symbol: '!', className: 'text-[#d29922]' },
    fail: { symbol: 'âœ•', className: 'text-[#f85149]' },
    unknown: { symbol: '?', className: 'text-[#8b949e]' },
  } as const;

  return (
    <div className="flex flex-col gap-3">
      <Card title="Security Check">
        <ul className="flex flex-col gap-2">
          {security.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2">
              <span className={`w-4 text-center font-bold ${icons[check.status].className}`}>
                {icons[check.status].symbol}
              </span>
              <div>
                <div className="text-[12px] text-[#e6edf3]">{check.label}</div>
                {check.detail ? (
                  <div className="text-[11px] text-[#8b949e]">{check.detail}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Findings">
        {security.findings.length === 0 ? (
          <p className="text-[12px] text-[#3fb950]">No security findings in the scanned scope.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {security.findings.map((finding) => (
              <li key={finding.title}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#e6edf3]">{finding.title}</span>
                  <ConfidenceBadge confidence={finding.confidence} />
                </div>
                {finding.detail ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#8b949e]">
                    {finding.detail}
                  </p>
                ) : null}
                <EvidenceList items={finding.evidence} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Privacy note">
        <p className="text-[11px] leading-relaxed text-[#8b949e]">
          Secret-like values are detected locally and redacted before anything is displayed or sent
          to an AI provider. Nothing is uploaded automatically.
        </p>
      </Card>
    </div>
  );
}
