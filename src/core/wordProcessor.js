const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü']);
const SIMPLE_STRUCTURES = new Set(['CV-CV', 'CV', 'CVC', 'CV-CVC']);

function normalizeWordValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function removeDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isVowel(char) {
  return VOWELS.has(char);
}

export function syllabifySpanishWord(word) {
  const text = normalizeWordValue(word);
  if (!text) return { syllables: [], needsReview: true };

  const syllables = [];
  let buffer = '';

  for (let i = 0; i < text.length; i += 1) {
    buffer += text[i];
    const current = text[i];
    const next = text[i + 1];

    if (!isVowel(current)) continue;
    if (!next) {
      syllables.push(buffer);
      buffer = '';
      continue;
    }

    if (isVowel(next)) {
      syllables.push(buffer);
      buffer = '';
      continue;
    }

    const next2 = text[i + 2];
    if (!next2) {
      syllables.push(buffer);
      buffer = next;
      i += 1;
      continue;
    }

    if (isVowel(next2)) {
      syllables.push(buffer);
      buffer = '';
      continue;
    }

    const cluster = `${next}${next2}`;
    const allowedOnsets = new Set(['pr', 'pl', 'br', 'bl', 'tr', 'dr', 'cr', 'cl', 'gr', 'gl', 'fr', 'fl']);
    if (allowedOnsets.has(cluster)) {
      syllables.push(buffer);
      buffer = '';
      continue;
    }

    syllables.push(`${buffer}${next}`);
    buffer = '';
    i += 1;
  }

  if (buffer) {
    if (syllables.length > 0) {
      syllables[syllables.length - 1] = `${syllables[syllables.length - 1]}${buffer}`;
    } else {
      syllables.push(buffer);
    }
  }

  const sanitized = syllables.map((item) => item.trim()).filter(Boolean);
  const joined = sanitized.join('');
  const needsReview = sanitized.length === 0 || joined !== text || sanitized.some((item) => ![...item].some((char) => isVowel(char)));

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
  if (rank <= 5000) return 2;
  return 3;
}

export function getDifficultyFromWordData(wordData) {
  const syllableCount = wordData.syllableCount;
  const structure = wordData.structure;
  const frequency = wordData.frequency;

  if (frequency === 3) return 3;

  if (syllableCount <= 2 && SIMPLE_STRUCTURES.has(structure) && (frequency === 1 || frequency === 2)) {
    return 1;
  }

  if (syllableCount === 3 && structure === 'CV-CV-CV' && (frequency === 1 || frequency === 2)) {
    return 2;
  }

  if (syllableCount >= 3 || structure.includes('CCV') || structure.includes('CC')) {
    return 3;
  }

  return 2;
}

function normalizeForId(word) {
  return removeDiacritics(word).replace(/[^a-z0-9ñ]/g, '').toLowerCase();
}

function normalizeRawEntry(rawEntry) {
  if (typeof rawEntry === 'string') {
    return { word: normalizeWordValue(rawEntry), frequencyRank: null };
  }

  return {
    word: normalizeWordValue(rawEntry?.word),
    frequencyRank: rawEntry?.frequencyRank ?? null
  };
}

export function enrichRawWord(rawEntry, category = 'general') {
  const base = normalizeRawEntry(rawEntry);
  const { syllables, needsReview } = syllabifySpanishWord(base.word);
  const structure = getSyllableStructure(syllables);
  const frequency = getFrequencyLevel(base.frequencyRank);

  const wordData = {
    word: base.word,
    syllables,
    syllableCount: syllables.length,
    initialSyllable: syllables[0] ?? '',
    finalSyllable: syllables[syllables.length - 1] ?? '',
    frequency,
    category,
    structure
  };

  const difficulty = getDifficultyFromWordData(wordData);
  const id = `lvl${difficulty}_${category}_${normalizeForId(base.word)}`;

  return {
    id,
    ...wordData,
    difficulty,
    image: null,
    needsReview
  };
}

export function buildProcessedWords(rawWords, { category = 'general' } = {}) {
  if (!Array.isArray(rawWords)) return [];

  return rawWords
    .map((entry) => enrichRawWord(entry, category))
    .filter((entry) => entry.word && entry.syllables.length > 0 && entry.structure);
}
