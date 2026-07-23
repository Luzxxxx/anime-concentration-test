import { describe, expect, it } from 'vitest';
import { CONFIG, QUESTION_BANK } from '../src/data/catalog.js';
import { selectQuestions } from '../src/core/question-selector.js';

function seededRandom(seed = 42) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

describe('question selection', () => {
  it.each([
    ['easy', 10, 2],
    ['normal', 15, 3],
    ['hard', 20, 4],
  ])('selects a balanced %s set', (mode, expectedCount, minimumPerCategory) => {
    const { questions, diagnostics } = selectQuestions(QUESTION_BANK, CONFIG, mode, seededRandom());
    expect(questions).toHaveLength(expectedCount);
    expect(new Set(questions.map((question) => question.id)).size).toBe(expectedCount);
    expect(diagnostics.warnings).toEqual([]);
    Object.keys(CONFIG.categories).forEach((category) => {
      expect(diagnostics.categoryCounts[category]).toBeGreaterThanOrEqual(minimumPerCategory);
    });
  });

  it('preserves the correct answer after shuffling options', () => {
    const { questions } = selectQuestions(QUESTION_BANK, CONFIG, 'easy', seededRandom(7));
    questions.forEach((question) => {
      const original = QUESTION_BANK.find((candidate) => candidate.id === question.id);
      expect(question.options[question.answer]).toBe(original.options[original.answer]);
    });
  });

  it('rejects an unknown mode', () => {
    expect(() => selectQuestions(QUESTION_BANK, CONFIG, 'nightmare', seededRandom())).toThrow('未知模式');
  });
});
