import { readFile, writeFile } from 'node:fs/promises';
import { buildProcessedWords } from '../src/core/wordProcessor.js';

const CORE_PATH = new URL('../src/data/processed/spanishWordsCore.json', import.meta.url);
const OUTPUT_PATH = new URL('../src/data/processed/processedWords.json', import.meta.url);

async function run() {
  const rawText = await readFile(CORE_PATH, 'utf8');
  const coreWords = JSON.parse(rawText);

  console.info(`[WORDS FLOW] Leyendo corpus base: ${CORE_PATH.pathname}`);
  console.info(`[WORDS FLOW] Entradas en corpus base: ${Array.isArray(coreWords) ? coreWords.length : 0}`);

  const processedWords = buildProcessedWords(coreWords, { validate: true });

  await writeFile(OUTPUT_PATH, `${JSON.stringify(processedWords, null, 2)}\n`, 'utf8');

  console.info(`[WORDS FLOW] processedWords generado en: ${OUTPUT_PATH.pathname}`);
  console.info(`[WORDS FLOW] Palabras válidas para juego: ${processedWords.length}`);
}

run().catch((error) => {
  console.error('[WORDS FLOW] Error al generar processedWords.json', error);
  process.exitCode = 1;
});
