import { createMetalinguisticEngine } from './src/core/metalinguisticEngine.js';

const engine = createMetalinguisticEngine();

const refs = {
  word: document.querySelector('#word-display'),
  tiles: document.querySelector('#tiles'),
  instruction: document.querySelector('#instruction'),
  answerForm: document.querySelector('#answer-form'),
  answerInput: document.querySelector('#answer-input'),
  feedback: document.querySelector('#feedback'),
  modeBtn: document.querySelector('#mode-btn'),
  nextBtn: document.querySelector('#next-btn'),
  wordBtn: document.querySelector('#word-btn')
};

const state = {
  mode: 'syllables',
  word: 'TOMATE',
  challenge: null
};

function setFeedback(kind, text) {
  refs.feedback.className = `feedback ${kind}`;
  refs.feedback.textContent = text;
}

function renderTiles() {
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
  refs.word.textContent = state.word;
  refs.instruction.textContent = state.challenge.instruction;
  refs.answerInput.value = '';
  renderTiles();
  setFeedback('idle', 'Piensa la palabra y escríbela.');
  refs.answerInput.focus();
}

function newWord() {
  state.word = engine.pickWord();
  loadChallenge();
}

refs.answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
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

refs.modeBtn.addEventListener('click', () => {
  state.mode = state.mode === 'syllables' ? 'letters' : 'syllables';
  refs.modeBtn.textContent = state.mode === 'syllables' ? 'Modo: Sílabas' : 'Modo: Letras';
  loadChallenge();
});

refs.nextBtn.addEventListener('click', loadChallenge);
refs.wordBtn.addEventListener('click', newWord);

newWord();
