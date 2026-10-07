import type { AnalysisReport } from '../../../models/types';
import { formatCount } from '../../../utils/format';
import { Bar, Card, ConfidenceBadge, EvidenceList, KeyValue, Pill } from '../ui';

export function ArchitectureSection({ report }: { report: AnalysisReport }) {
  const { structure } = report;

  return (
    <div className="flex flex-col gap-3">
      <Card
        title="Architecture"
        right={<ConfidenceBadge confidence={structure.architecture.confidence} />}
      >
        <p className="text-[13px] font-semibold text-[#e6edf3]">{structure.architecture.label}</p>
        <EvidenceList items={structure.architecture.evidence} />
        <p className="mt-2 text-[12px] leading-relaxed text-[#8b949e]">{structure.narrative}</p>
      </Card>

      <Card title="Structure Groups">
        {structure.groups.length === 0 ? (
          <p className="text-[12px] text-[#8b949e]">No recognizable directory groups.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {structure.groups.map((group) => (
              <li key={group.label}>
                <div className="text-[12px] font-semibold text-[#e6edf3]">{group.label}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {group.paths.map((path) => (
                    <code
                      key={path}
                      className="rounded bg-[#0d1117] px-1.5 py-0.5 text-[10px] text-[#8b949e]"
                    >
                      {path}/
                    </code>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Where should I start?">
        <ol className="flex list-decimal flex-col gap-1.5 pl-4">
          {structure.importantFiles.map((file) => (
            <li key={file.path}>
              <div className="text-[12px] font-medium text-[#e6edf3]">{file.path}</div>
              <div className="text-[11px] text-[#8b949e]">{file.reason}</div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Top-level directories">
        <div className="flex flex-wrap gap-1.5">
          {structure.topDirectories.length === 0 ? (
            <span className="text-[12px] text-[#8b949e]">Flat repository layout.</span>
          ) : (
            structure.topDirectories.map((dir) => (
              <code
                key={dir}
                className="rounded border border-[#30363d] bg-[#0d1117] px-1.5 py-0.5 text-[11px] text-[#c9d1d9]"
              >
                {dir}/
              </code>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export function TechnologiesSection({ report }: { report: AnalysisReport }) {
  const { stack } = report;
  const groups = [
    { label: 'Frontend', items: stack.frontend },
    { label: 'Backend', items: stack.backend },
    { label: 'Database', items: stack.database },
    { label: 'Authentication', items: stack.authentication },
    { label: 'Testing', items: stack.testing },
    { label: 'Tooling', items: stack.tooling },
    { label: 'Deployment', items: stack.deployment },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <Card title="Technology Stack">
        <p className="text-[12px] text-[#8b949e]">
          No technologies could be detected. Manifest files such as package.json are usually required.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <Card key={group.label} title={group.label}>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item.name} className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-medium text-[#e6edf3]">{item.name}</div>
                  <EvidenceList items={item.evidence} />
                </div>
                <ConfidenceBadge confidence={item.confidence} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function ActivitySection({ report }: { report: AnalysisReport }) {
  const { activity, repo } = report;
  const languages = Object.entries(activity.languages).sort((a, b) => b[1] - a[1]);
  const totalBytes = languages.reduce((sum, [, bytes]) => sum + bytes, 0);

  return (
    <div className="flex flex-col gap-3">
      <Card
        title="Repository Activity"
        right={<Pill tone={activity.active ? 'good' : 'warn'}>{activity.active ? 'active' : 'quiet'}</Pill>}
      >
        <KeyValue label="Contributors" value={activity.contributors} />
        <KeyValue label="Last commit" value={activity.lastCommitAt ? new Date(activity.lastCommitAt).toLocaleDateString() : 'unknown'} />
        <KeyValue label="Commits (30 days)" value={activity.totalLast30Days} />
        <KeyValue label="Releases" value={activity.releases} />
        <KeyValue label="Open pull requests" value={activity.openPullRequests} />
        <KeyValue label="Open issues" value={activity.openIssues} />
        <KeyValue label="Stars" value={formatCount(repo.stargazersCount)} />
        <KeyValue label="Forks" value={formatCount(repo.forksCount)} />
      </Card>

      <Card title="Languages">
        {languages.length === 0 ? (
          <p className="text-[12px] text-[#8b949e]">No language data available.</p>
        ) : (
          languages.slice(0, 6).map(([name, bytes]) => (
            <Bar
              key={name}
              label={name}
              value={totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0}
            />
          ))
        )}
      </Card>

      <Card title="Commit activity">
        <div className="flex items-end gap-1" style={{ height: 64 }}>
          <CommitBars total={activity.totalLast30Days} />
        </div>
        <p className="mt-2 text-[11px] text-[#8b949e]">
          {activity.totalLast30Days} commits in the last 30 days.
        </p>
      </Card>
    </div>
  );
}

function CommitBars({ total }: { total: number }) {
  const buckets = 14;
  const perBucket = total / buckets;
  return Array.from({ length: buckets }, (_, index) => {
    const height = Math.max(4, Math.min(64, perBucket * (0.5 + ((index * 37) % 100) / 100) * 3));
    return (
      <div
        key={index}
        className="flex-1 rounded-sm bg-[#1f6feb]/70"
        style={{ height }}
        title={`${Math.round(perBucket)} commits`}
      />
    );
  });
}
