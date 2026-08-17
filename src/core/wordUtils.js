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

export function normalizeSpanish(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFC')
    .replace(/[^a-záéíóúüñ]/gu, '');
}

export function getWordComplexity(word) {
  const parts = String(word?.structure ?? '').split('-').filter(Boolean);
  if (parts.some((part) => part.startsWith('CC'))) return 'trabadas';
  if (parts.some((part) => part !== 'CV')) return 'mixed';
  return 'simple';
}

export function getFilteredWords(filters = {}) {
  const { difficulty, category, syllableCount, frequency, structure, complexity } = filters;

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


    if (complexity !== undefined) {
      const allowed = Array.isArray(complexity) ? complexity : [complexity];
      if (!allowed.includes(getWordComplexity(word))) return false;
    }

    return true;
  });
}
