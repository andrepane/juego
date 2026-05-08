import { WORDS } from '../data/words/index.js';

export function getAllWords() {
  return [...WORDS];
}

export function shuffleArray(array) {
  const next = [...array];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }

  return next;
}

export function getRandomWord(words = WORDS) {
  if (words.length === 0) {
    return null;
  }

  return words[Math.floor(Math.random() * words.length)];
}

export function getFilteredWords(filters = {}) {
  const { difficulty, category, syllableCount, frequency, structure } = filters;

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

    if (frequency !== undefined) {
      if (Array.isArray(frequency)) {
        if (!frequency.includes(word.frequency)) {
          return false;
        }
      } else if (word.frequency !== frequency) {
        return false;
      }
    }

    if (structure !== undefined) {
      if (Array.isArray(structure)) {
        if (!structure.includes(word.structure)) {
          return false;
        }
      } else if (word.structure !== structure) {
        return false;
      }
    }

    return true;
  });
}
