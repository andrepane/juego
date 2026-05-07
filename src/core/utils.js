export function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getWordsByDifficulty(words, difficulty) {
  return words.filter((word) => word.difficulty === difficulty);
}

export function getRandomWord(words, filters = {}) {
  const { difficulty, category, syllableCount } = filters;

  let pool = [...words];

  if (difficulty !== undefined) {
    pool = getWordsByDifficulty(pool, difficulty);
  }

  if (category !== undefined) {
    pool = getWordsByCategory(pool, category);
  }

  if (syllableCount !== undefined) {
    pool = getWordsWithSyllableCount(pool, syllableCount);
  }

  if (pool.length === 0) {
    return getRandomItem(words);
  }

  return getRandomItem(pool);
}

export function getWordsByCategory(words, category) {
  return words.filter((word) => word.category === category);
}

export function getWordsWithSyllableCount(words, syllableCount) {
  return words.filter((word) => word.syllableCount === syllableCount);
}

export function generateNumericDistractors(correctValue, min = 1, max = 5, total = 3) {
  const candidates = [];

  for (let value = min; value <= max; value += 1) {
    if (value !== correctValue) {
      candidates.push(value);
    }
  }

  candidates.sort((a, b) => Math.abs(a - correctValue) - Math.abs(b - correctValue));

  const closest = candidates.slice(0, Math.max(0, total - 1));
  return shuffleArray([correctValue, ...closest]);
}

export function createOption(id, label) {
  return { id, label: String(label) };
}
