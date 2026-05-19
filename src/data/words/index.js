const DATASET_URL = './src/data/processed/processedWords.json';

export const WORDS = [];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeWordEntry(rawEntry) {
  const word = normalizeText(rawEntry?.word);
  const category = normalizeText(rawEntry?.category) || 'general';
  const syllables = Array.isArray(rawEntry?.syllables)
    ? rawEntry.syllables.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  const difficulty = Number(rawEntry?.difficulty);
  const frequency = Number(rawEntry?.frequency);

  return {
    id: String(rawEntry?.id || ''),
    word,
    syllables,
    syllableCount: Number(rawEntry?.syllableCount),
    initialSyllable: normalizeText(rawEntry?.initialSyllable),
    finalSyllable: normalizeText(rawEntry?.finalSyllable),
    difficulty,
    frequency,
    category,
    structure: typeof rawEntry?.structure === 'string' ? rawEntry.structure.trim() : '',
    image: rawEntry?.image ?? null,
    needsReview: Boolean(rawEntry?.needsReview)
  };
}

function hasValidGameShape(entry) {
  return Boolean(
    entry.id
      && entry.word
      && entry.structure
      && Number.isInteger(entry.difficulty)
      && Number.isInteger(entry.frequency)
      && Array.isArray(entry.syllables)
      && entry.syllables.length > 0
      && entry.syllableCount === entry.syllables.length
  );
}

export async function loadWordsDataset(datasetUrl = DATASET_URL) {
  console.info(`[WORDS FLOW] Cargando dataset único desde: ${datasetUrl}`);

  const response = await fetch(datasetUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${datasetUrl} (${response.status}).`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Dataset inválido en ${datasetUrl}: debe ser un array.`);
  }

  const normalized = payload.map(normalizeWordEntry);
  const valid = normalized.filter(hasValidGameShape);

  WORDS.length = 0;
  WORDS.push(...valid);

  console.info('[WORDS FLOW] Dataset procesado', {
    source: datasetUrl,
    loaded: payload.length,
    normalized: normalized.length,
    validForGame: valid.length,
    availableInGame: WORDS.length
  });

  return {
    source: datasetUrl,
    loaded: payload.length,
    normalized: normalized.length,
    validForGame: valid.length,
    availableInGame: WORDS.length
  };
}
