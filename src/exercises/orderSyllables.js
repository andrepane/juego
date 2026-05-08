import { getFilteredWords, getRandomWord, shuffleArray } from '../core/wordUtils.js';

export const ORDER_LEVELS = {
  1: {
    id: 1,
    label: 'Nivel 1',
    filters: {
      syllableCount: 2,
      frequency: [1, 2],
      structure: ['CV-CV']
    }
  },
  2: {
    id: 2,
    label: 'Nivel 2',
    filters: {
      syllableCount: 3,
      frequency: [1, 2],
      structure: ['CV-CV-CV']
    }
  },
  3: {
    id: 3,
    label: 'Nivel 3',
    filters: {
      syllableCount: 3,
      frequency: 3
    }
  }
};

function createSyllablePieces(syllables) {
  const shuffled = shuffleArray(syllables);

  return shuffled.map((text, index) => ({
    id: `${text}-${index}`,
    text,
    positionSlot: index
  }));
}

export function createOrderSyllablesRound(level = 1) {
  const config = ORDER_LEVELS[level] ?? ORDER_LEVELS[1];
  const candidates = getFilteredWords(config.filters);
  const word = getRandomWord(candidates);

  if (!word) {
    return null;
  }

  return {
    level: config.id,
    levelLabel: config.label,
    filters: config.filters,
    word: {
      id: word.id,
      text: word.word,
      syllables: [...word.syllables]
    },
    pieces: createSyllablePieces(word.syllables),
    expectedLength: word.syllables.length,
    correctAnswer: word.syllables.join('-')
  };
}
