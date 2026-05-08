import { validateWords } from './src/core/validateWords.js';
import { WORDS } from './src/data/words/index.js';
import { createOrderSyllablesRound } from './src/exercises/orderSyllables.js';

const refs = {
  levelButtons: document.querySelectorAll('.level-btn'),
  exerciseContainer: document.querySelector('#exercise-container'),
  feedback: document.querySelector('#feedback'),
  score: document.querySelector('#score'),
  roundWord: document.querySelector('#round-word'),
  levelLabel: document.querySelector('#level-label'),
  nextBtn: document.querySelector('#next-btn')
};

const state = {
  level: 1,
  score: 0,
  round: null,
  answer: []
};

const POSITION_PATTERNS = {
  2: ['slot-a', 'slot-d'],
  3: ['slot-a', 'slot-c', 'slot-e'],
  4: ['slot-a', 'slot-b', 'slot-d', 'slot-f']
};

function setFeedback(message, type = '') {
  refs.feedback.textContent = message;
  refs.feedback.className = `feedback ${type ? `is-${type}` : ''}`;
}

function getLayoutClass(pieceCount) {
  return POSITION_PATTERNS[pieceCount] ?? POSITION_PATTERNS[3];
}

function renderRound() {
  const round = state.round;

  if (!round) {
    refs.exerciseContainer.innerHTML = '';
    setFeedback('No hay palabras disponibles con esos filtros.', 'error');
    return;
  }

  refs.levelLabel.textContent = round.levelLabel;
  refs.roundWord.textContent = `${round.word.syllables.length} sílabas`;

  const piecesWrap = document.createElement('div');
  piecesWrap.className = 'pieces-cloud';

  const slots = getLayoutClass(round.pieces.length);

  round.pieces.forEach((piece, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `syllable-piece ${slots[index] ?? 'slot-c'}`;
    button.textContent = piece.text;
    button.dataset.syllable = piece.text;
    button.addEventListener('click', () => handleSyllableTap(button));
    piecesWrap.appendChild(button);
  });

  const answerWrap = document.createElement('div');
  answerWrap.className = 'answer-zone';
  answerWrap.innerHTML = '<p class="answer-zone__label">Construye la palabra</p>';

  const slotsWrap = document.createElement('div');
  slotsWrap.className = 'answer-slots';

  for (let index = 0; index < round.expectedLength; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'answer-slot';
    slot.dataset.index = String(index);
    slotsWrap.appendChild(slot);
  }

  answerWrap.appendChild(slotsWrap);

  refs.exerciseContainer.innerHTML = '';
  refs.exerciseContainer.append(piecesWrap, answerWrap);
}

function updateAnswerSlots() {
  const slots = refs.exerciseContainer.querySelectorAll('.answer-slot');

  slots.forEach((slot, index) => {
    slot.textContent = state.answer[index] ?? '';
  });
}

function handleSyllableTap(button) {
  if (!state.round || state.answer.length >= state.round.expectedLength) {
    return;
  }

  const expected = state.round.word.syllables[state.answer.length];
  const tapped = button.dataset.syllable;

  if (tapped !== expected) {
    button.classList.remove('is-wrong');
    void button.offsetWidth;
    button.classList.add('is-wrong');
    setFeedback('Esa no va ahí. Inténtalo de nuevo.', 'error');
    return;
  }

  state.answer.push(tapped);
  updateAnswerSlots();
  button.classList.remove('is-correct');
  void button.offsetWidth;
  button.classList.add('is-correct');
  setFeedback('¡Bien! Sigue.', 'success');

  if (state.answer.length === state.round.expectedLength) {
    validateRound();
  }
}

function validateRound() {
  const answer = state.answer.join('-');

  if (answer === state.round.correctAnswer) {
    state.score += 1;
    refs.score.textContent = String(state.score);
    setFeedback('Excelente. Nueva palabra…', 'success');
    window.setTimeout(startRound, 900);
    return;
  }

  refs.exerciseContainer.querySelector('.answer-zone')?.classList.add('is-wrong');
  setFeedback('Orden incorrecto. Probemos otra vez.', 'error');
  state.answer = [];
  window.setTimeout(updateAnswerSlots, 250);
}

function startRound() {
  state.answer = [];
  state.round = createOrderSyllablesRound(state.level);
  renderRound();
  setFeedback('Toca las sílabas en orden para formar una palabra.', '');
}

function setLevel(level) {
  state.level = level;
  refs.levelButtons.forEach((btn) => btn.classList.toggle('is-active', Number(btn.dataset.level) === level));
  startRound();
}

function init() {
  validateWords(WORDS);

  refs.levelButtons.forEach((button) => {
    button.addEventListener('click', () => setLevel(Number(button.dataset.level)));
  });

  refs.nextBtn.addEventListener('click', startRound);
  setLevel(1);
}

init();
