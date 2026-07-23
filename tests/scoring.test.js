import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/data/catalog.js';
import {
  calculateAnswerScore,
  calculateComboBonus,
  calculateKnowledgeScore,
  getCategoryScores,
  getMaxCompetitiveScore,
  getRank,
} from '../src/core/scoring.js';

describe('scoring', () => {
  const easy = { difficulty: 'easy', category: 'anime', answer: 2 };

  it('awards base and speed points for a fast correct answer', () => {
    expect(calculateAnswerScore(easy, 2, 4, CONFIG)).toEqual({ correct: true, points: 15, basePoints: 10 });
  });

  it('does not award points for an incorrect answer', () => {
    expect(calculateAnswerScore(easy, 1, 4, CONFIG)).toEqual({ correct: false, points: 0, basePoints: 0 });
  });

  it('caps combo bonuses', () => {
    expect(calculateComboBonus(1, CONFIG)).toBe(0);
    expect(calculateComboBonus(3, CONFIG)).toBe(10);
    expect(calculateComboBonus(99, CONFIG)).toBe(CONFIG.comboCap);
  });

  it('calculates weighted knowledge percentage', () => {
    const questions = [easy, { difficulty: 'hard', category: 'game', answer: 0 }];
    expect(calculateKnowledgeScore(questions, [{ correct: true }, { correct: false }], CONFIG)).toBeCloseTo(100 / 3);
  });

  it('calculates a deterministic competitive ceiling', () => {
    const questions = [easy, easy, easy];
    expect(getMaxCompetitiveScore(questions, CONFIG)).toBe(60);
  });

  it('clamps percentages when selecting a rank', () => {
    expect(getRank(-10, CONFIG).title).toBe('二次元萌新');
    expect(getRank(120, CONFIG).title).toBe('二次元之神');
  });

  it('summarizes category samples without counting unanswered questions', () => {
    const questions = [easy, { difficulty: 'medium', category: 'anime', answer: 0 }];
    const result = getCategoryScores(questions, [{ correct: true }], CONFIG);
    expect(result.anime).toEqual({ correct: 1, total: 1, earnedBase: 10, totalBase: 10 });
    expect(result.game.total).toBe(0);
  });
});
