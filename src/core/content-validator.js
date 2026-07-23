const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_TYPES = ['choice', 'audio', 'scene', 'character'];

function questionSignature(question) {
  return [question.question?.trim() ?? '', question.voiceText?.trim() ?? ''].join('::');
}

export function validateQuestionBank(questionBank, config) {
  const errors = [];
  const warnings = [];
  const idSet = new Set();
  const stats = {
    total: questionBank.length,
    byCategory: {},
    byDifficulty: {},
    byType: {},
    answerPosition: [0, 0, 0, 0],
  };
  const validCategories = Object.keys(config.categories);

  questionBank.forEach((question, index) => {
    if (idSet.has(question.id)) errors.push(`ID重复: #${question.id} (题目索引${index})`);
    idSet.add(question.id);

    if (!Number.isInteger(question.id) || question.id <= 0) {
      errors.push(`ID不合法: #${question.id} (题目索引${index})`);
    }
    if (typeof question.question !== 'string' || question.question.trim().length === 0) {
      errors.push(`题干为空: #${question.id} (题目索引${index})`);
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push(`选项数量不为4: #${question.id} (题目索引${index})`);
    } else if (question.options.some((option) => typeof option !== 'string' || option.trim().length === 0)) {
      errors.push(`存在空选项: #${question.id} (题目索引${index})`);
    }
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      errors.push(`答案索引不合法: #${question.id}, answer=${question.answer}`);
    } else {
      stats.answerPosition[question.answer] += 1;
    }
    if (!validCategories.includes(question.category)) {
      errors.push(`分类不合法: #${question.id}, category="${question.category}"`);
    }
    if (!VALID_DIFFICULTIES.includes(question.difficulty)) {
      errors.push(`难度不合法: #${question.id}, difficulty="${question.difficulty}"`);
    }
    if (!VALID_TYPES.includes(question.type)) {
      errors.push(`题型不合法: #${question.id}, type="${question.type}"`);
    }
    if (question.type === 'audio' && (!question.voiceText || question.voiceText.trim().length === 0)) {
      errors.push(`音频题缺少voiceText: #${question.id}`);
    }

    stats.byCategory[question.category] = (stats.byCategory[question.category] || 0) + 1;
    stats.byDifficulty[question.difficulty] = (stats.byDifficulty[question.difficulty] || 0) + 1;
    stats.byType[question.type] = (stats.byType[question.type] || 0) + 1;
  });

  const seenSignatures = new Map();
  questionBank.forEach((question) => {
    const signature = questionSignature(question);
    if (seenSignatures.has(signature)) {
      warnings.push(`题目重复: #${seenSignatures.get(signature)} 与 #${question.id}`);
    } else {
      seenSignatures.set(signature, question.id);
    }
  });

  return { pass: errors.length === 0, errors, warnings, stats };
}

export function validateCharacterCatalog(characters) {
  const errors = [];
  const ids = new Set();
  const dimensions = ['passion', 'gaming', 'voice', 'meme', 'knowledge', 'reaction'];

  characters.forEach((character) => {
    if (!character.id || ids.has(character.id)) errors.push(`角色ID缺失或重复: ${character.id}`);
    ids.add(character.id);
    if (!character.name || !character.rarity) errors.push(`角色信息不完整: ${character.id}`);
    dimensions.forEach((dimension) => {
      const score = character.targetScores?.[dimension];
      const weight = character.weights?.[dimension];
      if (typeof score !== 'number' || score < 0 || score > 100) {
        errors.push(`角色维度分数不合法: ${character.id}.${dimension}`);
      }
      if (typeof weight !== 'number' || weight <= 0) {
        errors.push(`角色权重不合法: ${character.id}.${dimension}`);
      }
    });
  });

  return { pass: errors.length === 0, errors };
}
