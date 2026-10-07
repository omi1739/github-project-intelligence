import type { AnalysisContext, ReadmeReport } from '../models/types';

export function analyzeReadme(context: AnalysisContext): ReadmeReport {
  const readme = context.readme;
  if (!readme) {
    return {
      exists: false,
      length: 0,
      sections: [],
      hasInstallInstructions: false,
      hasScreenshots: false,
      hasEnvExample: false,
      summary: null,
    };
  }

  const sections = [...readme.matchAll(/^#{1,3}\s+(.+)$/gm)]
    .map((match) => (match[1] ?? '').trim())
    .filter((title) => title.length > 0 && title.length < 60);

  const hasInstallInstructions = /(installation|getting started|setup|quick ?start|usage)/i.test(
    readme,
  );
  const hasScreenshots = /!\[[^\]]*\]\(|<img\s/i.test(readme);
  const hasEnvExample =
    /\.env\b/i.test(readme) || context.tree.some((node) => /\.env\.(example|sample|template)$/i.test(node.path));

  const summary = summarizeReadme(readme, sections);

  return {
    exists: true,
    length: readme.length,
    sections: sections.slice(0, 12),
    hasInstallInstructions,
    hasScreenshots,
    hasEnvExample,
    summary,
  };
}

function summarizeReadme(readme: string, sections: string[]): string | null {
  const paragraph = readme
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block.length > 60 &&
        !block.startsWith('#') &&
        !block.startsWith('!') &&
        !block.startsWith('```') &&
        !/^\[!\[/.test(block),
    );

  const parts: string[] = [];
  if (paragraph) parts.push(paragraph.replace(/\s+/g, ' ').slice(0, 260));
  if (sections.length > 0) parts.push(`Documented sections: ${sections.slice(0, 6).join(', ')}.`);
  return parts.length > 0 ? parts.join(' ') : null;
}
