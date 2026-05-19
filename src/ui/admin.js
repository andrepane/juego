import { generateWordsFromAI } from '../core/generateWordsFromAI.js';
import { WORDS } from '../data/words/index.js';
import { importWordsFromArray } from '../core/importWords.js';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function createCorpusSet() {
  return new Set(WORDS.map((entry) => normalizeText(entry.word)).filter(Boolean));
}

function isStructureValid(structure) {
  return /^[CV]+(-[CV]+)*$/.test((structure || '').trim());
}

function hasValidShape(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (!normalizeText(entry.word)) return false;
  if (!normalizeText(entry.category)) return false;
  if (typeof entry.structure !== 'string' || !entry.structure.trim()) return false;
  if (!Array.isArray(entry.syllables) || entry.syllables.length === 0) return false;
  return true;
}

export function createAdminController({ adminScreen }) {
  const refs = {
    form: adminScreen.querySelector('#admin-ai-form'),
    generateBtn: adminScreen.querySelector('#generate-ai-batch-btn'),
    importBtn: adminScreen.querySelector('#import-valid-btn'),
    status: adminScreen.querySelector('#admin-status'),
    summary: adminScreen.querySelector('#admin-summary'),
    validList: adminScreen.querySelector('#admin-valid-list'),
    duplicateList: adminScreen.querySelector('#admin-duplicate-list'),
    invalidList: adminScreen.querySelector('#admin-invalid-list')
  };

  const state = { validCandidates: [] };

  function setStatus(message, type = '') {
    refs.status.textContent = message;
    refs.status.className = `admin-status ${type ? `is-${type}` : ''}`;
  }

  function renderList(target, rows, emptyMessage) {
    target.innerHTML = '';

    if (rows.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = emptyMessage;
      target.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      const item = document.createElement('li');
      item.textContent = row;
      target.appendChild(item);
    });
  }

  function renderPreview(candidates) {
    const corpusWords = createCorpusSet();
    const batchWords = new Set();
    const valid = [];
    const duplicates = [];
    const invalid = [];

    candidates.forEach((entry, index) => {
      const word = normalizeText(entry?.word) || `index:${index}`;

      if (!hasValidShape(entry)) {
        invalid.push(`${word}: formato básico inválido`);
        return;
      }

      if (!isStructureValid(entry.structure)) {
        invalid.push(`${entry.word}: estructura inválida (${entry.structure})`);
        return;
      }

      if (batchWords.has(entry.word) || corpusWords.has(entry.word)) {
        duplicates.push(`${entry.word}: duplicada en lote/corpus`);
        return;
      }

      batchWords.add(entry.word);
      valid.push(entry);
    });

    state.validCandidates = valid;
    refs.importBtn.disabled = valid.length === 0;

    refs.summary.innerHTML = [
      `<li>Generadas: <strong>${candidates.length}</strong></li>`,
      `<li>Válidas: <strong>${valid.length}</strong></li>`,
      `<li>Duplicadas: <strong>${duplicates.length}</strong></li>`,
      `<li>Rechazadas: <strong>${invalid.length}</strong></li>`
    ].join('');

    renderList(refs.validList, valid.map((item) => `${item.word} · ${item.category} · ${item.structure}`), 'Sin palabras válidas.');
    renderList(refs.duplicateList, duplicates, 'Sin duplicados.');
    renderList(refs.invalidList, invalid, 'Sin errores de estructura.');
  }

  function mapNetworkError(message) {
    if (/Failed to fetch|NetworkError/i.test(message)) return 'Error de red/CORS al conectar con Magic Loops.';
    if (/timeout/i.test(message)) return 'Timeout llamando al endpoint de Magic Loops.';
    if (/json/i.test(message)) return 'Formato inválido en la respuesta del servicio IA.';
    return message;
  }

  async function handleGenerate(event) {
    event.preventDefault();
    refs.generateBtn.disabled = true;
    refs.importBtn.disabled = true;
    setStatus('Generando lote con IA…', 'working');

    const formData = new FormData(refs.form);
    const requestPayload = {
      category: formData.get('category'),
      structure: formData.get('structure'),
      difficulty: Number(formData.get('difficulty')),
      frequency: Number(formData.get('frequency')),
      count: Number(formData.get('count'))
    };

    const summary = await generateWordsFromAI({
      saveToFile: false,
      requestPayload
    });

    refs.generateBtn.disabled = false;

    if (summary.errors.length > 0) {
      setStatus(mapNetworkError(summary.errors[0]), 'error');
      renderPreview([]);
      return;
    }

    renderPreview(summary.candidates || []);
    setStatus(`Lote generado (${summary.received}). Revisa la preview antes de importar.`, 'success');
  }

  function handleImport() {
    const summary = importWordsFromArray(state.validCandidates);

    if (summary.errors.length > 0) {
      setStatus(summary.errors[0], 'error');
      return;
    }

    setStatus(`Importación completada. Añadidas: ${summary.added.length}, rechazadas: ${summary.rejected.length}.`, 'success');
  }

  function bindEvents() {
    refs.form.addEventListener('submit', (event) => {
      void handleGenerate(event);
    });

    refs.importBtn.addEventListener('click', handleImport);
  }

  return { bindEvents };
}
