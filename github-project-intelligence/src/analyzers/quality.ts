import type { AnalysisContext, CodeQualityReport, Finding } from '../models/types';
import { formatBytes } from '../utils/format';

const LARGE_FILE_THRESHOLD = 150 * 1024;

export function analyzeQuality(context: AnalysisContext): CodeQualityReport {
  const largeFiles = context.tree
    .filter(
      (node) =>
        node.type === 'blob' &&
        (node.size ?? 0) >= LARGE_FILE_THRESHOLD &&
        !/\.(png|jpe?g|gif|svg|webp|ico|pdf|mp4|zip|woff2?|ttf)$/i.test(node.path),
    )
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, 8)
    .map((node) => ({ path: node.path, size: node.size ?? 0 }));

  let todoCount = 0;
  let fixmeCount = 0;
  const notes: string[] = [];

  for (const [path, content] of context.fileContents) {
    if (!/\.(ts|tsx|js|jsx|py|java|go|rb|php|cs|cpp|c)$/i.test(path)) continue;
    todoCount += (content.match(/\bTODO\b/g) ?? []).length;
    fixmeCount += (content.match(/\bFIXME\b/g) ?? []).length;
  }

  const scannedFiles = [...context.fileContents.keys()].filter((path) =>
    /\.(ts|tsx|js|jsx|py|java|go|rb|php|cs|cpp|c)$/i.test(path),
  ).length;

  if (scannedFiles === 0) {
    notes.push('No source files were sampled, so TODO/FIXME counts are not available.');
  } else {
    notes.push(`TODO/FIXME counted across ${scannedFiles} sampled source file(s).`);
  }
  if (largeFiles.length > 0) {
    notes.push('Consider splitting unusually large files into smaller modules.');
  }

  return { largeFiles, todoCount, fixmeCount, scannedFiles, notes };
}

export function qualityFindings(quality: CodeQualityReport): Finding[] {
  const findings: Finding[] = [];

  if (quality.largeFiles.length > 0) {
    findings.push({
      title: `${quality.largeFiles.length} large file(s)`,
      detail: quality.largeFiles
        .slice(0, 4)
        .map((file) => `${file.path} (${formatBytes(file.size)})`)
        .join(', '),
      evidence: quality.largeFiles
        .slice(0, 4)
        .map((file) => ({ label: file.path, source: 'file tree' })),
      confidence: 'high',
    });
  }

  findings.push({
    title: `${quality.todoCount} TODO · ${quality.fixmeCount} FIXME`,
    detail: quality.notes.join(' '),
    evidence: [{ label: 'keyword scan', source: 'sampled files' }],
    confidence: quality.scannedFiles > 0 ? 'medium' : 'low',
  });

  return findings;
}
