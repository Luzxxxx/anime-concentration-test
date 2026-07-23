export function shuffle(items, random = Math.random) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function weightedPick(pool, distribution, usedIds, random) {
  const byDifficulty = { easy: [], medium: [], hard: [] };
  pool.forEach((question) => {
    if (!usedIds.has(question.id)) byDifficulty[question.difficulty].push(question);
  });

  const available = Object.keys(distribution)
    .filter((difficulty) => byDifficulty[difficulty].length > 0)
    .map((difficulty) => ({ difficulty, weight: distribution[difficulty] }));
  if (!available.length) return null;

  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  let selectedDifficulty = available[0].difficulty;
  if (totalWeight > 0) {
    let cursor = random() * totalWeight;
    for (const item of available) {
      cursor -= item.weight;
      if (cursor <= 0) {
        selectedDifficulty = item.difficulty;
        break;
      }
    }
  }

  const candidates = byDifficulty[selectedDifficulty];
  return candidates[Math.floor(random() * candidates.length)];
}

export function selectQuestions(questionBank, config, mode, random = Math.random) {
  const modeConfig = config.modes[mode];
  if (!modeConfig) throw new Error(`未知模式: ${mode}`);

  const categories = Object.keys(config.categories);
  const minimumPerCategory = mode === 'easy' ? 2 : mode === 'normal' ? 3 : 4;
  const selected = [];
  const usedIds = new Set();
  const diagnostics = {
    mode,
    targetCount: modeConfig.count,
    minPerCategory: minimumPerCategory,
    categoryCounts: {},
    insufficientSamples: false,
    warnings: [],
  };

  categories.forEach((category) => {
    const pool = shuffle(
      questionBank.filter((question) => question.category === category),
      random,
    );
    let selectedFromCategory = 0;
    while (selectedFromCategory < minimumPerCategory) {
      const question = weightedPick(pool, modeConfig.distribution, usedIds, random);
      if (!question) break;
      selected.push(question);
      usedIds.add(question.id);
      selectedFromCategory += 1;
    }
    if (selectedFromCategory < minimumPerCategory) {
      diagnostics.insufficientSamples = true;
      diagnostics.warnings.push(
        `分类 "${category}" 题库不足，仅抽取到 ${selectedFromCategory} 题（需要 ${minimumPerCategory} 题）`,
      );
    }
  });

  while (selected.length < modeConfig.count) {
    const question = weightedPick(questionBank, modeConfig.distribution, usedIds, random);
    if (!question) break;
    selected.push(question);
    usedIds.add(question.id);
  }

  if (selected.length < modeConfig.count) {
    diagnostics.warnings.push(`题库总量不足，仅抽取到 ${selected.length} 题（需要 ${modeConfig.count} 题）`);
  }

  const finalSelection = shuffle(selected, random).slice(0, modeConfig.count);
  finalSelection.forEach((question) => {
    diagnostics.categoryCounts[question.category] = (diagnostics.categoryCounts[question.category] || 0) + 1;
  });

  const questions = finalSelection.map((question) => {
    const correctAnswer = question.options[question.answer];
    const options = shuffle(question.options, random);
    return { ...question, options, answer: options.indexOf(correctAnswer) };
  });

  return { questions, diagnostics };
}
