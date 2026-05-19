import { level1Animals } from './animals.js';
import { level1Home } from './home.js';
import { level1Food } from './food.js';
import { RAW_SPANISH_WORDS } from '../raw/spanishWords.js';
import { buildProcessedWords } from '../../core/wordProcessor.js';

const baseWords = [...level1Animals, ...level1Home, ...level1Food];
const existingWords = new Set(baseWords.map((entry) => entry.word));
const processedGeneralWords = buildProcessedWords(RAW_SPANISH_WORDS, { category: 'general' })
  .filter((entry) => !existingWords.has(entry.word));

export const WORDS = [...baseWords, ...processedGeneralWords];
