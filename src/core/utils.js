export function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getWordsByDifficulty(words, difficulty) {
  return words.filter((word) => word.difficulty === difficulty);
}

export function generateNumericDistractors(correctValue, min = 1, max = 5, total = 5) {
  const candidates = [];

  for (let value = min; value <= max; value += 1) {
    if (value !== correctValue) {
      candidates.push(value);
    }
  }

  const distractors = shuffleArray(candidates).slice(0, Math.max(0, total - 1));
  return shuffleArray([correctValue, ...distractors]);
}
