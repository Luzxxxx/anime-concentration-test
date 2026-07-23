import { describe, expect, it } from 'vitest';
import { CONFIG, QUESTION_BANK } from '../src/data/catalog.js';
import { CHARACTER_DB } from '../src/data/characters.js';
import { validateCharacterCatalog, validateQuestionBank } from '../src/core/content-validator.js';

describe('content validation', () => {
  it('accepts the production catalogs without warnings', () => {
    const questions = validateQuestionBank(QUESTION_BANK, CONFIG);
    const characters = validateCharacterCatalog(CHARACTER_DB);
    expect(questions.pass).toBe(true);
    expect(questions.warnings).toEqual([]);
    expect(questions.stats.total).toBe(226);
    expect(characters).toEqual({ pass: true, errors: [] });
    expect(CHARACTER_DB).toHaveLength(20);
  });

  it('reports malformed and duplicate questions', () => {
    const broken = [
      { id: 1, question: '重复', options: ['', 'B'], answer: 7, category: 'unknown', difficulty: 'x', type: 'audio' },
      { id: 1, question: '重复', options: ['A', 'B', 'C', 'D'], answer: 0, category: 'anime', difficulty: 'easy', type: 'choice' },
    ];
    const report = validateQuestionBank(broken, CONFIG);
    expect(report.pass).toBe(false);
    expect(report.errors.length).toBeGreaterThan(4);
    expect(report.warnings).toEqual(['题目重复: #1 与 #1']);
  });
});
