import { createMetalinguisticEngine } from './src/core/metalinguisticEngine.js';

const engine = createMetalinguisticEngine();

const refs = {
  word: document.querySelector('#word-display'),
  tiles: document.querySelector('#tiles'),
  instruction: document.querySelector('#instruction'),
  answerForm: document.querySelector('#answer-form'),
  answerInput: document.querySelector('#answer-input'),
  feedback: document.querySelector('#feedback'),
  setupZone: document.querySelector('#setup-zone'),
  syllablesSelect: document.querySelector('#syllables-select'),
  lettersSelect: document.querySelector('#letters-select'),
  setupBtn: document.querySelector('#setup-btn'),
  modeBtn: document.querySelector('#mode-btn'),
  nextBtn: document.querySelector('#next-btn'),
  wordBtn: document.querySelector('#word-btn')
};

const state = {
  mode: 'syllables',
  word: 'TOMATE',
  challenge: null,
  setupDone: false
};

function expectedStructure() {
  return {
    syllables: engine.splitSyllables(state.word).length,
    letters: state.word.length
  };
}

function fillSetupSelectors() {
  const limits = { syllables: 6, letters: 12 };
  refs.syllablesSelect.innerHTML = '<option value="">Selecciona</option>';
  refs.lettersSelect.innerHTML = '<option value="">Selecciona</option>';

  for (let i = 1; i <= limits.syllables; i += 1) {
    refs.syllablesSelect.insertAdjacentHTML('beforeend', `<option value="${i}">${i}</option>`);
  }

  for (let i = 1; i <= limits.letters; i += 1) {
    refs.lettersSelect.insertAdjacentHTML('beforeend', `<option value="${i}">${i}</option>`);
  }
}

function setFeedback(kind, text) {
  refs.feedback.className = `feedback ${kind}`;
  refs.feedback.textContent = text;
}

function renderTiles() {
  if (!state.setupDone) {
    refs.tiles.innerHTML = '';
    return;
  }

  const total = state.mode === 'syllables'
    ? state.challenge.baseParts.length
    : state.word.length;

  refs.tiles.innerHTML = '';
  for (let i = 0; i < total; i += 1) {
    const tile = document.createElement('span');
    tile.className = `tile ${state.mode}`;
    refs.tiles.appendChild(tile);
  }
}

function loadChallenge() {
  state.challenge = engine.createChallenge(state.word, state.mode);
  state.setupDone = false;
  refs.word.textContent = state.word;
  refs.instruction.textContent = state.challenge.instruction;
  refs.answerInput.value = '';
  refs.syllablesSelect.value = '';
  refs.lettersSelect.value = '';
  refs.setupZone.classList.remove('shake');
  renderTiles();
  setFeedback('idle', 'Selecciona sílabas y letras para empezar.');
  refs.syllablesSelect.focus();
}

function newWord() {
  state.word = engine.pickWord();
  loadChallenge();
}

refs.answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.setupDone) {
    setFeedback('error', 'Primero valida sílabas y letras.');
    refs.setupZone.classList.remove('shake');
    void refs.setupZone.offsetWidth;
    refs.setupZone.classList.add('shake');
    return;
  }

  const answer = refs.answerInput.value;

  if (engine.isCorrect(state.challenge, answer)) {
    setFeedback('ok', `Bien. Resultado: ${state.challenge.answer}`);
    refs.tiles.classList.add('pulse');
    setTimeout(() => {
      refs.tiles.classList.remove('pulse');
      loadChallenge();
    }, 700);
    return;
  }

  setFeedback('error', 'No coincide. Vuelve a intentarlo.');
  refs.answerInput.select();
});

refs.setupBtn.addEventListener('click', () => {
  const selectedSyllables = Number(refs.syllablesSelect.value);
  const selectedLetters = Number(refs.lettersSelect.value);
  const expected = expectedStructure();
  const ok = selectedSyllables === expected.syllables && selectedLetters === expected.letters;

  if (!ok) {
    state.setupDone = false;
    renderTiles();
    setFeedback('error', 'No coincide. Revisa y vuelve a intentar.');
    refs.setupZone.classList.remove('shake');
    void refs.setupZone.offsetWidth;
    refs.setupZone.classList.add('shake');
    return;
  }

  state.setupDone = true;
  refs.setupZone.classList.remove('shake');
  renderTiles();
  setFeedback('ok', '¡Correcto! Ahora resuelve la consigna.');
  refs.answerInput.focus();
});

refs.modeBtn.addEventListener('click', () => {
  state.mode = state.mode === 'syllables' ? 'letters' : 'syllables';
  refs.modeBtn.textContent = state.mode === 'syllables' ? 'Modo: Sílabas' : 'Modo: Letras';
  loadChallenge();
});

refs.nextBtn.addEventListener('click', loadChallenge);
refs.wordBtn.addEventListener('click', newWord);

fillSetupSelectors();
newWord();
