import { validateWords } from './validateWords.js';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü']);
const STRONG_VOWELS = new Set(['a', 'á', 'e', 'é', 'o', 'ó']);
const SIMPLE_STRUCTURES = new Set(['CV', 'CV-CV', 'CVC', 'CV-CVC', 'CVV', 'CVV-CV']);
const ALLOWED_ONSETS = new Set([
  'pr', 'pl', 'br', 'bl', 'tr', 'dr', 'cr', 'cl', 'gr', 'gl', 'fr', 'fl', 'ch', 'll', 'rr'
]);

function normalizeWordValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function removeDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isVowel(char) {
  return VOWELS.has(char);
}

function isStrongVowel(char) {
  return STRONG_VOWELS.has(char);
}


function startsDiphthong(a, b) {
  if (!isVowel(a) || !isVowel(b)) return false;
  const aStrong = isStrongVowel(a);
  const bStrong = isStrongVowel(b);

  // hiato fuerte-fuerte
  if (aStrong && bStrong) return false;
  // débil tónica rompe diptongo
  if ((a === 'í' || a === 'ú') || (b === 'í' || b === 'ú')) return false;

  return true;
}

function cleanForWord(value) {
  return normalizeWordValue(value).replace(/[^a-záéíóúüñ]/g, '');
}

export function syllabifySpanishWord(word) {
  const text = cleanForWord(word);
  if (!text) return { syllables: [], needsReview: true };

  const syllables = [];
  let cursor = 0;

  while (cursor < text.length) {
    let onsetEnd = cursor;
    while (onsetEnd < text.length && !isVowel(text[onsetEnd])) onsetEnd += 1;

    if (onsetEnd >= text.length) {
      if (syllables.length > 0) {
        syllables[syllables.length - 1] += text.slice(cursor);
      } else {
        syllables.push(text.slice(cursor));
      }
      break;
    }

    let nucleusEnd = onsetEnd + 1;
    if (nucleusEnd < text.length && startsDiphthong(text[nucleusEnd - 1], text[nucleusEnd])) {
      nucleusEnd += 1;
      if (nucleusEnd < text.length && startsDiphthong(text[nucleusEnd - 1], text[nucleusEnd])) {
        nucleusEnd += 1;
      }
    }

    let codaSplit = nucleusEnd;
    let consonantRunEnd = nucleusEnd;

    while (consonantRunEnd < text.length && !isVowel(text[consonantRunEnd])) consonantRunEnd += 1;

    const run = text.slice(nucleusEnd, consonantRunEnd);
    if (consonantRunEnd >= text.length) {
      codaSplit = consonantRunEnd;
    } else if (run.length <= 1) {
      codaSplit = nucleusEnd;
    } else if (run.length === 2 && ALLOWED_ONSETS.has(run)) {
      codaSplit = nucleusEnd;
    } else if (run.length === 2) {
      codaSplit = nucleusEnd + 1;
    } else {
      const lastTwo = run.slice(-2);
      codaSplit = ALLOWED_ONSETS.has(lastTwo) ? consonantRunEnd - 2 : consonantRunEnd - 1;
    }

    syllables.push(text.slice(cursor, codaSplit));
    cursor = codaSplit;
  }

  const sanitized = syllables.map((item) => item.trim()).filter(Boolean);
  const rejoined = sanitized.join('');
  const needsReview =
    rejoined !== text ||
    sanitized.some((item) => ![...item].some((char) => isVowel(char))) ||
    sanitized.some((item) => item.length > 6);

  return { syllables: sanitized, needsReview };
}

export function getSyllableStructure(syllables) {
  if (!Array.isArray(syllables) || syllables.length === 0) return '';

  return syllables
    .map((syllable) => [...syllable].map((char) => (isVowel(char) ? 'V' : 'C')).join(''))
    .join('-');
}

export function getFrequencyLevel(frequencyRank) {
  const rank = Number(frequencyRank);
  if (!Number.isFinite(rank)) return 2;
  if (rank >= 1 && rank <= 1000) return 1;
  if (rank >= 1001 && rank <= 5000) return 2;
  return 3;
}

export function getDifficultyFromWordData(wordData) {
  const syllableCount = Number(wordData?.syllableCount) || 0;
  const structure = wordData?.structure || '';
  const frequency = Number(wordData?.frequency) || 2;

  const hasComplexCluster = structure.includes('CC');
  const hasMixedStructure = structure.split('-').some((part) => part.length >= 4);

  if (frequency === 3 || hasComplexCluster || hasMixedStructure || syllableCount >= 4) {
    return 3;
  }

  if (syllableCount >= 1 && syllableCount <= 2 && SIMPLE_STRUCTURES.has(structure) && frequency <= 2) {
    return 1;
  }

  if (syllableCount === 3 && frequency <= 2) {
    return 2;
  }

  return 2;
}

function normalizeForId(word) {
  return removeDiacritics(word).replace(/[^a-z0-9ñ]/g, '').toLowerCase();
}

function normalizeRawEntry(rawEntry) {
  if (typeof rawEntry === 'string') {
    return { word: cleanForWord(rawEntry), frequencyRank: null, category: 'general' };
  }

  return {
    word: cleanForWord(rawEntry?.word),
    frequencyRank: rawEntry?.frequencyRank ?? null,
    category: normalizeWordValue(rawEntry?.category) || 'general'
  };
}

export function enrichRawWord(rawEntry, category = 'general') {
  const base = normalizeRawEntry(rawEntry);
  const resolvedCategory = category === 'general' ? base.category : category;
  const { syllables, needsReview: syllableReview } = syllabifySpanishWord(base.word);
  const structure = getSyllableStructure(syllables);
  const frequency = getFrequencyLevel(base.frequencyRank);

  const wordData = {
    word: base.word,
    syllables,
    syllableCount: syllables.length,
    initialSyllable: syllables[0] ?? '',
    finalSyllable: syllables[syllables.length - 1] ?? '',
    frequency,
    category: resolvedCategory,
    structure
  };

  const difficulty = getDifficultyFromWordData(wordData);
  const id = `lvl${difficulty}_${resolvedCategory}_${normalizeForId(base.word)}`;
  const needsReview =
    syllableReview ||
    !/^([CV]+)(-[CV]+)*$/.test(structure) ||
    syllables.some((part) => part.length === 0);

  return {
    id,
    ...wordData,
    difficulty,
    image: null,
    needsReview
  };
}

export function buildProcessedWords(rawWords, { category = 'general', validate = true } = {}) {
  if (!Array.isArray(rawWords)) return [];

  const seenIds = new Set();
  const seenWords = new Set();

  const processed = rawWords
    .map((entry) => enrichRawWord(entry, category))
    .filter((entry) => {
      if (!entry.word || entry.syllables.length === 0 || !entry.structure) return false;

      const duplicateId = seenIds.has(entry.id);
      const duplicateWord = seenWords.has(entry.word);
      seenIds.add(entry.id);
      seenWords.add(entry.word);

      if (duplicateId || duplicateWord) {
        entry.needsReview = true;
      }

      return true;
    });

  if (validate) {
    validateWords(processed);
  }

  return processed;
}
