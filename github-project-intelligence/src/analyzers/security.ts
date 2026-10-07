import type {
  AnalysisContext,
  Finding,
  SecurityCheck,
  SecurityReport,
} from '../models/types';
import { countSecretLikeMatches } from '../utils/redact';

export function analyzeSecurity(context: AnalysisContext): SecurityReport {
  const paths = context.tree.map((node) => node.path);
  const checks: SecurityCheck[] = [];
  const findings: Finding[] = [];

  const hasGitignore = paths.some((path) => /(^|\/)\.gitignore$/.test(path));
  checks.push({
    label: '.gitignore detected',
    status: hasGitignore ? 'pass' : 'warn',
    detail: hasGitignore ? undefined : 'No .gitignore found at the repository root.',
  });

  const committedEnv = paths.filter(
    (path) => /(^|\/)\.env(\.[a-z0-9]+)?$/i.test(path) && !/\.env\.(example|sample|template)$/i.test(path),
  );
  checks.push({
    label: 'No obvious exposed .env file',
    status: committedEnv.length === 0 ? 'pass' : 'fail',
    detail:
      committedEnv.length === 0
        ? undefined
        : `Possible committed environment files: ${committedEnv.slice(0, 3).join(', ')}`,
  });

  const envExample = paths.some((path) => /(^|\/)\.env\.(example|sample|template)$/i.test(path));
  checks.push({
    label: 'Environment variable template present',
    status: envExample ? 'pass' : 'unknown',
    detail: envExample ? undefined : 'No .env.example was detected.',
  });

  let secretMatches = 0;
  for (const [, content] of context.fileContents) {
    secretMatches += countSecretLikeMatches(content);
  }
  checks.push({
    label: 'Local secret-like pattern scan',
    status: secretMatches === 0 ? 'pass' : 'warn',
    detail:
      secretMatches === 0
        ? `${context.fileContents.size} scanned file(s), no secret-like patterns.`
        : `${secretMatches} secret-like pattern(s) found in ${context.fileContents.size} scanned file(s). Values are kept local and never exported.`,
  });

  if (secretMatches > 0) {
    findings.push({
      title: 'Potential hard-coded secret detected',
      detail:
        'One or more scanned files contain API_KEY/SECRET/TOKEN-like assignments. Analyze locally and rotate anything real before sharing.',
      evidence: [{ label: `${secretMatches} match(es)`, source: 'local scan' }],
      confidence: 'medium',
    });
  }

  if (committedEnv.length > 0) {
    findings.push({
      title: 'Environment file possibly committed',
      detail: committedEnv.slice(0, 3).join(', '),
      evidence: committedEnv.slice(0, 3).map((path) => ({ label: path, source: 'file tree' })),
      confidence: 'high',
    });
  }

  const manifestCount = context.packageJson.length;
  checks.push({
    label: 'Dependencies require review',
    status: manifestCount > 0 ? 'warn' : 'unknown',
    detail:
      manifestCount > 0
        ? `${manifestCount} manifest(s) found. Run your package manager audit for a real dependency scan.`
        : 'No dependency manifest detected.',
  });

  checks.push({
    label: 'HTTPS references',
    status: (context.readme ?? '').includes('https://') ? 'pass' : 'unknown',
    detail: 'README links use HTTPS.',
  });

  return { checks, findings };
}
