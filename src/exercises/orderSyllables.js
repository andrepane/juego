import { getFilteredWords, getRandomWord, shuffleArray } from '../core/wordUtils.js';
import { resolveOrderLevel } from './orderSyllablesConfig.js';

function getLinguisticCandidates(levelConfig) {
  const base = getFilteredWords(levelConfig.linguisticFilters);
  if (levelConfig.id !== 3) {
    return base;
  }
  return base.filter((word) => word.structure !== 'CV-CV-CV');
}

function createSyllablePieces(syllables) {
  const shuffled = shuffleArray(syllables);

  return shuffled.map((text, index) => ({
    id: `${text}-${index}`,
    text,
    positionSlot: index
  }));
}

export function createOrderSyllablesRound(level = 1) {
  const config = resolveOrderLevel(level);
  const candidates = getLinguisticCandidates(config);
  const word = getRandomWord(candidates);

  if (!word) {
    return null;
  }

  return {
    level: config.id,
    levelLabel: config.label,
    filters: config.linguisticFilters,
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
