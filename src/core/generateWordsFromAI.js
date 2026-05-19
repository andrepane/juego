const MAGIC_LOOPS_ENDPOINT = 'https://magicloops.dev/api/loop/aea151c4-e470-4236-970c-b6232786c816/run?input=Hello+World';
const DEFAULT_OUTPUT_PATH = './src/data/imports/newWords.json';

function normalizeWord(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function extractCandidates(payload) {
  if (Array.isArray(payload)) return payload;

  const collections = [payload?.words, payload?.data, payload?.result, payload?.items, payload?.candidates];
  for (const collection of collections) {
    if (Array.isArray(collection)) return collection;
  }

  return null;
}

function sanitizeCandidate(rawEntry) {
  if (!rawEntry || typeof rawEntry !== 'object') return null;

  return {
    ...rawEntry,
    word: normalizeWord(rawEntry.word),
    category: typeof rawEntry.category === 'string' ? rawEntry.category.trim().toLowerCase() : rawEntry.category,
    structure: typeof rawEntry.structure === 'string' ? rawEntry.structure.trim() : rawEntry.structure,
    syllables: Array.isArray(rawEntry.syllables)
      ? rawEntry.syllables.map((item) => normalizeWord(item)).filter(Boolean)
      : rawEntry.syllables
  };
}

function validateBasicStructure(entry) {
  const issues = [];

  if (!entry.word) issues.push('word vacío');
  if (!entry.category || typeof entry.category !== 'string') issues.push('category inválido');
  if (!entry.structure || typeof entry.structure !== 'string') issues.push('structure inválido');
  if (!Array.isArray(entry.syllables) || entry.syllables.length === 0) issues.push('syllables inválido');

  return issues;
}

async function persistCandidates(outputPath, words) {
  const fsModule = await import('node:fs/promises');
  const content = JSON.stringify(words, null, 2);
  await fsModule.writeFile(outputPath, `${content}\n`, 'utf8');
}

export async function generateWordsFromAI({
  endpoint = MAGIC_LOOPS_ENDPOINT,
  outputPath = DEFAULT_OUTPUT_PATH,
  fetchImpl = fetch,
  onError = console.error,
  onInfo = console.info,
  saveToFile = true,
  requestPayload = {}
} = {}) {
  const summary = {
    endpoint,
    received: 0,
    valid: 0,
    deduplicated: 0,
    written: false,
    outputPath,
    errors: [],
    rejected: [],
    candidates: []
  };

  try {
    const hasPayload = Object.keys(requestPayload || {}).length > 0;
    const response = await fetchImpl(endpoint, hasPayload
      ? {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }
      : { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Magic Loops devolvió ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const rawCandidates = extractCandidates(payload);

    if (!rawCandidates) {
      throw new Error('La respuesta no contiene un array de palabras candidatas.');
    }

    summary.received = rawCandidates.length;

    const seenWords = new Set();
    const validCandidates = [];

    rawCandidates.forEach((candidate, index) => {
      const sanitized = sanitizeCandidate(candidate);
      const entryLabel = sanitized?.word || `index:${index}`;

      if (!sanitized) {
        summary.rejected.push({ index, word: entryLabel, reason: 'entry inválido' });
        return;
      }

      const issues = validateBasicStructure(sanitized);
      if (issues.length > 0) {
        summary.rejected.push({ index, word: entryLabel, reason: issues.join(', ') });
        return;
      }

      if (seenWords.has(sanitized.word)) {
        summary.deduplicated += 1;
        return;
      }

      seenWords.add(sanitized.word);
      validCandidates.push(sanitized);
    });

    summary.valid = validCandidates.length;
    summary.candidates = validCandidates;

    if (saveToFile) {
      await persistCandidates(outputPath, validCandidates);
      summary.written = true;
    }

    onInfo('[AI WORDS] Pipeline completado.', {
      received: summary.received,
      valid: summary.valid,
      deduplicated: summary.deduplicated,
      rejected: summary.rejected.length,
      written: summary.written,
      outputPath
    });

    if (summary.rejected.length > 0) {
      onError('[AI WORDS] Candidatas rechazadas:', summary.rejected);
    }
  } catch (error) {
    summary.errors.push(error.message);
    onError('[AI WORDS] Error en generación/importación de candidatas:', error);
  }

  return summary;
}

export { MAGIC_LOOPS_ENDPOINT, DEFAULT_OUTPUT_PATH };
