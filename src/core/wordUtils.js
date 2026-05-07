import { WORDS } from '../data/words/index.js';

export function getAllWords() {
  return [...WORDS];
}

export function getWordsByDifficulty(level) {
  return WORDS.filter((word) => word.difficulty === level);
}

export function getWordsByCategory(category) {
  return WORDS.filter((word) => word.category === category);
}

export function getWordsWithSyllableCount(count) {
  return WORDS.filter((word) => word.syllableCount === count);
}

export function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export function getRandomWord(words = WORDS) {
  if (words.length === 0) {
    return null;
  }

  return words[Math.floor(Math.random() * words.length)];
}

export function getFilteredWords(filters = {}) {
  const { difficulty, category, syllableCount } = filters;

  return WORDS.filter((word) => {
    if (difficulty !== undefined && word.difficulty !== difficulty) {
      return false;
    }

    if (category !== undefined && word.category !== category) {
      return false;
    }

    if (syllableCount !== undefined && word.syllableCount !== syllableCount) {
      return false;
    }

    return true;
  });
}
