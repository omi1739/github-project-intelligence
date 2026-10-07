import type { AnalysisReport } from '../../../models/types';
import { Bar, Card, KeyValue, Pill } from '../ui';

export function OverviewSection({ report }: { report: AnalysisReport }) {
  const { overview, health, repo, readme } = report;

  return (
    <div className="flex flex-col gap-3">
      <Card title="Repository Health" right={<Pill tone="neutral">overall {health.overall}/100</Pill>}>
        <div className="mb-2 text-2xl font-bold text-[#e6edf3]">{health.overall}<span className="text-sm font-medium text-[#8b949e]">/100</span></div>
        {health.categories.map((category) => (
          <Bar key={category.key} label={category.label} value={category.score} />
        ))}
        <p className="mt-1 text-[11px] leading-relaxed text-[#8b949e]">{health.summary}</p>
      </Card>

      <Card
        title="Project Overview"
        right={
          <Pill tone={overview.status === 'active' ? 'good' : overview.status === 'archived' ? 'bad' : 'warn'}>
            {overview.status}
          </Pill>
        }
      >
        <KeyValue label="Name" value={repo.fullName} />
        <KeyValue label="Type" value={overview.type} />
        <KeyValue label="Primary language" value={overview.primaryLanguage} />
        <KeyValue label="Framework" value={overview.framework} />
        <KeyValue label="Database" value={overview.database} />
        <KeyValue label="Authentication" value={overview.authentication} />
        <KeyValue label="License" value={overview.license} />
        <KeyValue label="Last commit" value={overview.lastCommitAgo} />
        <KeyValue label="Stars" value={repo.stargazersCount.toLocaleString()} />
        <KeyValue label="Open issues" value={repo.openIssuesCount.toLocaleString()} />
        <KeyValue label="Description" value={repo.description} />
      </Card>

      <Card title="README Intelligence">
        {readme.exists ? (
          <>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Pill tone={readme.hasInstallInstructions ? 'good' : 'warn'}>
                {readme.hasInstallInstructions ? 'setup instructions' : 'no setup section'}
              </Pill>
              <Pill tone={readme.hasScreenshots ? 'good' : 'warn'}>
                {readme.hasScreenshots ? 'screenshots' : 'no screenshots'}
              </Pill>
              <Pill tone={readme.hasEnvExample ? 'good' : 'neutral'}>
                {readme.hasEnvExample ? 'env example' : 'no env example'}
              </Pill>
            </div>
            {readme.summary ? (
              <p className="text-[12px] leading-relaxed text-[#c9d1d9]">{readme.summary}</p>
            ) : null}
            <p className="mt-2 text-[10px] text-[#6e7681]">
              {readme.sections.length} section(s) Â· {readme.length.toLocaleString()} characters
            </p>
          </>
        ) : (
          <p className="text-[12px] text-[#8b949e]">No README detected in this repository.</p>
        )}
      </Card>

      {report.warnings.length > 0 ? (
        <Card title="Warnings">
          <ul className="list-disc pl-4 text-[11px] text-[#d29922]">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
