export function calculateAnswerScore(question, selectedIndex, timeTaken, config) {
  const correct = selectedIndex === question.answer;
  if (!correct) return { correct: false, points: 0, basePoints: 0 };

  const basePoints = config.baseScore[question.difficulty] || 10;
  const speedBonus = timeTaken <= config.timeBonusThreshold ? config.timeBonus : 0;
  return { correct: true, points: basePoints + speedBonus, basePoints };
}

export function calculateComboBonus(combo, config) {
  if (combo < 2) return 0;
  return Math.min((combo - 1) * config.comboBonus, config.comboCap);
}

export function calculateKnowledgeScore(questions, answers, config) {
  let earnedBase = 0;
  let totalBase = 0;
  questions.forEach((question, index) => {
    const base = config.baseScore[question.difficulty] || 10;
    totalBase += base;
    if (answers[index]?.correct) earnedBase += base;
  });
  const percentage = totalBase > 0 ? (earnedBase / totalBase) * 100 : 0;
  return Math.max(0, Math.min(100, percentage));
}

export function getMaxCompetitiveScore(questions, config) {
  let maximum = 0;
  let accumulatedComboBonus = 0;

  questions.forEach((question, index) => {
    maximum += config.baseScore[question.difficulty] || 10;
    maximum += config.timeBonus;
    if (index > 0) {
      accumulatedComboBonus = Math.min(accumulatedComboBonus + config.comboBonus, config.comboCap);
      maximum += accumulatedComboBonus;
    }
  });

  return maximum;
}

export function getRank(percentage, config) {
  const normalized = Math.max(0, Math.min(100, percentage));
  return config.ranks.find((rank) => normalized >= rank.min && normalized <= rank.max) || config.ranks[0];
}

export function getCategoryScores(questions, answers, config) {
  const result = Object.fromEntries(
    Object.keys(config.categories).map((category) => [
      category,
      { correct: 0, total: 0, earnedBase: 0, totalBase: 0 },
    ]),
  );

  questions.forEach((question, index) => {
    const category = result[question.category];
    const answer = answers[index];
    if (!category || !answer) return;

    const base = config.baseScore[question.difficulty] || 10;
    category.total += 1;
    category.totalBase += base;
    if (answer.correct) {
      category.correct += 1;
      category.earnedBase += base;
    }
  });

  return result;
}
