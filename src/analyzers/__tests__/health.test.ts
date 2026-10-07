import { describe, expect, it } from 'vitest';
import { calculateHealth } from '../health';
import { analyzeReadme } from '../readme';
import { analyzeTesting } from '../testing';
import { analyzeDependencies } from '../dependencies';
import { analyzeQuality } from '../quality';
import { makeContext } from './fixtures';

function healthInputs(context = makeContext()) {
  return {
    readme: analyzeReadme(context),
    testing: analyzeTesting(context),
    activity: context.activity,
    dependencies: analyzeDependencies(context),
    quality: analyzeQuality(context),
    archived: false,
  };
}

describe('calculateHealth', () => {
  it('returns an overall score with per-category explanations', () => {
    const context = makeContext();
    const health = calculateHealth(healthInputs(context), context);

    expect(health.overall).toBeGreaterThanOrEqual(60);
    expect(health.overall).toBeLessThanOrEqual(100);
    expect(health.categories).toHaveLength(6);
    for (const category of health.categories) {
      expect(category.score).toBeGreaterThanOrEqual(0);
      expect(category.score).toBeLessThanOrEqual(100);
      expect(category.explanation.length).toBeGreaterThan(0);
    }
    expect(health.summary).toMatch(/Strongest/);
  });

  it('scores testing higher when tests and CI are present', () => {
    const context = makeContext();
    const withTests = calculateHealth(healthInputs(context), context);

    const withoutTestsContext = makeContext({
      tree: context.tree.filter(
        (node) => !node.path.includes('__tests__') && !node.path.includes('workflows'),
      ),
      packageJson: [
        { path: 'package.json', content: JSON.stringify({ dependencies: { react: '19.0.0' } }) },
      ],
    });
    const withoutTests = calculateHealth(healthInputs(withoutTestsContext), withoutTestsContext);

    const scoreOf = (health: typeof withTests, key: string) =>
      health.categories.find((category) => category.key === key)?.score ?? 0;

    expect(scoreOf(withTests, 'testing')).toBeGreaterThan(scoreOf(withoutTests, 'testing'));
    expect(scoreOf(withTests, 'ci')).toBeGreaterThan(scoreOf(withoutTests, 'ci'));
  });

  it('drops maintenance to near zero for archived repositories', () => {
    const context = makeContext();
    const health = calculateHealth({ ...healthInputs(context), archived: true }, context);
    const maintenance = health.categories.find((category) => category.key === 'maintenance');

    expect(maintenance?.score).toBe(10);
    expect(maintenance?.explanation).toContain('archived');
  });
});
