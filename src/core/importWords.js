import { WORDS } from '../data/words/index.js';

const ALLOWED_CATEGORIES = new Set(['animales', 'hogar', 'comida', 'escuela', 'cuerpo', 'juguetes', 'ropa', 'naturaleza']);
const ALLOWED_FREQUENCIES = new Set([1, 2, 3]);

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function sanitizeWordEntry(rawEntry) {
  const word = normalizeText(rawEntry?.word);
  const category = normalizeText(rawEntry?.category);
  const structure = typeof rawEntry?.structure === 'string' ? rawEntry.structure.trim() : '';
  const syllables = Array.isArray(rawEntry?.syllables)
    ? rawEntry.syllables.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  const difficulty = Number(rawEntry?.difficulty);
  const frequency = Number(rawEntry?.frequency);

  return {
    ...rawEntry,
    word,
    category,
    structure,
    syllables,
    syllableCount: Number(rawEntry?.syllableCount),
    difficulty,
    frequency,
    initialSyllable: normalizeText(rawEntry?.initialSyllable),
    finalSyllable: normalizeText(rawEntry?.finalSyllable)
  };
}

function validateImportEntry(entry) {
  const errors = [];

  if (!entry.word) errors.push('word vacío.');
  if (!entry.structure) errors.push('structure vacío.');
  if (!Array.isArray(entry.syllables) || entry.syllables.length === 0) errors.push('syllables vacío.');
  if (!ALLOWED_CATEGORIES.has(entry.category)) errors.push(`categoría inválida: ${entry.category || 'vacía'}.`);
  if (!ALLOWED_FREQUENCIES.has(entry.frequency)) errors.push(`frequency inválida: ${entry.frequency}.`);
  if (!Number.isInteger(entry.difficulty) || entry.difficulty < 1) errors.push(`difficulty inválida: ${entry.difficulty}.`);

  if (entry.syllableCount !== entry.syllables.length) {
    errors.push(`syllableCount incorrecto (${entry.syllableCount}) para ${entry.syllables.length} sílabas.`);
  }

  if (entry.syllables.length > 0 && entry.initialSyllable !== entry.syllables[0]) {
    errors.push('initialSyllable no coincide con la primera sílaba.');
  }

  if (entry.syllables.length > 0 && entry.finalSyllable !== entry.syllables[entry.syllables.length - 1]) {
    errors.push('finalSyllable no coincide con la última sílaba.');
  }

  return errors;
}

function buildId(entry) {
  return `lvl${entry.difficulty}_${entry.category}_${entry.word}`;
}

export async function importWordsFromJson(jsonPath = './src/data/imports/newWords.json') {
  const summary = { added: [], rejected: [], errors: [] };

  try {
    const response = await fetch(jsonPath);
    if (!response.ok) throw new Error(`No se pudo leer ${jsonPath} (${response.status}).`);

    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error('El JSON de importación debe ser un array.');

    const existingIds = new Set(WORDS.map((entry) => entry.id));
    const existingWords = new Set(WORDS.map((entry) => normalizeText(entry.word)));

    payload.forEach((rawEntry, index) => {
      const sanitized = sanitizeWordEntry(rawEntry);
      const id = buildId(sanitized);

      if (existingWords.has(sanitized.word)) {
        const reason = `Duplicado detectado: "${sanitized.word}" ya existe. Se omite.`;
        summary.rejected.push({ index, word: sanitized.word || `index:${index}`, reason });
        console.warn(`[WORDS IMPORT][SKIP] ${reason}`);
        return;
      }

      const validationErrors = validateImportEntry(sanitized);

      if (existingIds.has(id)) {
        validationErrors.push(`ID duplicado generado automáticamente: ${id}.`);
      }

      if (validationErrors.length > 0) {
        summary.rejected.push({ index, word: sanitized.word || `index:${index}`, reason: validationErrors.join(' ') });
        return;
      }

      const nextWord = {
        id,
        word: sanitized.word,
        syllables: sanitized.syllables,
        syllableCount: sanitized.syllableCount,
        initialSyllable: sanitized.initialSyllable,
        finalSyllable: sanitized.finalSyllable,
        difficulty: sanitized.difficulty,
        frequency: sanitized.frequency,
        category: sanitized.category,
        structure: sanitized.structure,
        image: sanitized.image ?? null
      };

      WORDS.push(nextWord);
      existingIds.add(id);
      existingWords.add(sanitized.word);
      summary.added.push(nextWord);
    });
  } catch (error) {
    summary.errors.push(error.message);
    console.error('[WORDS IMPORT][ERROR]', error);
  }

  console.info('[WORDS IMPORT] Resumen', {
    added: summary.added.length,
    rejected: summary.rejected.length,
    errors: summary.errors.length
  });

  if (summary.rejected.length > 0) {
    console.warn('[WORDS IMPORT] Rechazadas:', summary.rejected);
  }

  if (summary.errors.length > 0) {
    console.error('[WORDS IMPORT] Errores críticos:', summary.errors);
  }

  return summary;
}
