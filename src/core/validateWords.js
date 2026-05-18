const ALLOWED_CATEGORIES = new Set(['animales', 'hogar', 'comida', 'escuela', 'cuerpo', 'juguetes', 'ropa', 'naturaleza']);
const ALLOWED_DIFFICULTIES = new Set([1, 2, 3, 4]);
const ALLOWED_FREQUENCIES = new Set([1, 2, 3]);
const ID_PATTERN = /^lvl(\d+)_([a-z]+)_([a-z0-9áéíóúüñ]+)$/i;
const STRUCTURE_PATTERN = /^(CV|CVC|VC)(-(CV|CVC|VC))*$/;

function logWordsError(message) {
  console.error('[WORDS ERROR]');
  console.error(message);
}

function logWordsWarning(message) {
  console.warn('[WORDS WARNING]');
  console.warn(message);
}

export function validateWords(words) {
  if (!Array.isArray(words)) {
    logWordsError('Dataset is not an array.');
    return { errors: 1, warnings: 0 };
  }

  let errors = 0;
  let warnings = 0;
  const ids = new Map();
  const wordsByValue = new Map();

  words.forEach((entry, index) => {
    const ref = entry?.word || `index:${index}`;

    if (!entry || typeof entry !== 'object') {
      errors += 1;
      logWordsError(`Invalid word entry at index ${index}.`);
      return;
    }

    let parsedId = null;
    if (!entry.id || typeof entry.id !== 'string' || entry.id.trim() === '') {
      errors += 1;
      logWordsError(`Empty id in word: ${ref}`);
    } else {
      const normalizedId = entry.id.trim();
      parsedId = normalizedId.match(ID_PATTERN);

      if (!parsedId) {
        errors += 1;
        logWordsError(`Malformed id: ${entry.id}`);
      }

      if (ids.has(normalizedId)) {
        errors += 1;
        logWordsError(`Duplicate id: ${normalizedId}`);
      } else {
        ids.set(normalizedId, entry);
      }
    }

    if (!entry.word || typeof entry.word !== 'string' || entry.word.trim() === '') {
      errors += 1;
      logWordsError(`Empty word value in id: ${entry.id || `index:${index}`}`);
    } else {
      const normalizedWord = entry.word.trim().toLowerCase();
      if (!wordsByValue.has(normalizedWord)) {
        wordsByValue.set(normalizedWord, []);
      }
      wordsByValue.get(normalizedWord).push(entry);
    }

    const normalizedCategory = entry.category?.trim().toLowerCase();
    if (!normalizedCategory) {
      errors += 1;
      logWordsError(`Empty category in word: ${ref}`);
    } else if (!ALLOWED_CATEGORIES.has(normalizedCategory)) {
      errors += 1;
      logWordsError(`Category not allowed in word ${ref}: ${entry.category}`);
    }

    if (!entry.structure || typeof entry.structure !== 'string' || entry.structure.trim() === '') {
      errors += 1;
      logWordsError(`Empty structure in word: ${ref}`);
    } else if (!STRUCTURE_PATTERN.test(entry.structure.trim())) {
      errors += 1;
      logWordsError(`Invalid structure format in word ${ref}: ${entry.structure}`);
    }

    if (!ALLOWED_DIFFICULTIES.has(entry.difficulty)) {
      errors += 1;
      logWordsError(`Invalid difficulty in word ${ref}: ${entry.difficulty}`);
    }

    if (!ALLOWED_FREQUENCIES.has(entry.frequency)) {
      errors += 1;
      logWordsError(`Invalid frequency in word ${ref}: ${entry.frequency}`);
    }

    if (!Array.isArray(entry.syllables) || entry.syllables.length === 0) {
      errors += 1;
      logWordsError(`Empty syllables array in word: ${ref}`);
      return;
    }

    if (entry.syllableCount !== entry.syllables.length) {
      errors += 1;
      logWordsError(`Incorrect syllableCount in word: ${ref}`);
    }

    if (entry.structure && entry.syllableCount && entry.structure.split('-').length !== entry.syllableCount) {
      errors += 1;
      logWordsError(`Structure and syllableCount mismatch in word: ${ref}`);
    }

    if (entry.initialSyllable !== entry.syllables[0]) {
      errors += 1;
      logWordsError(`Incorrect initialSyllable in word: ${ref}`);
    }

    if (entry.finalSyllable !== entry.syllables[entry.syllables.length - 1]) {
      errors += 1;
      logWordsError(`Incorrect finalSyllable in word: ${ref}`);
    }

    if (parsedId) {
      const [, levelId, categoryId, wordId] = parsedId;
      if (Number(levelId) !== entry.difficulty) {
        errors += 1;
        logWordsError(`ID level and difficulty mismatch in ${entry.id}`);
      }
      if (normalizedCategory && categoryId !== normalizedCategory) {
        warnings += 1;
        logWordsWarning(`ID category and category mismatch in ${entry.id}`);
      }
      if (entry.word && wordId !== entry.word.toLowerCase()) {
        warnings += 1;
        logWordsWarning(`ID word segment and word mismatch in ${entry.id}`);
      }
    }
  });

  wordsByValue.forEach((entries, normalizedWord) => {
    if (entries.length > 1) {
      const categories = [...new Set(entries.map((item) => item.category || 'sin-categoría'))].join(', ');
      warnings += 1;
      logWordsWarning(`Duplicate word detected: ${normalizedWord}. Categories: ${categories}. IDs: ${entries.map((item) => item.id).join(', ')}`);
    }
  });

  if (errors === 0 && warnings === 0) {
    console.info('[WORDS OK] Dataset validation completed without issues.');
  } else {
    console.info(`[WORDS CHECK] Completed with ${errors} error(s) and ${warnings} warning(s).`);
  }

  return { errors, warnings };
}
