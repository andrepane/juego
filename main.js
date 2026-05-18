import { validateWords } from './src/core/validateWords.js';
import { WORDS } from './src/data/words/index.js';
import { createHomeController } from './src/ui/home.js';
import { createRouter } from './src/navigation/router.js';
import { createExerciseRegistry } from './src/core/exerciseRegistry.js';
import { createOrderSyllablesPlugin } from './src/exercises/orderSyllablesPlugin.js';
import { ORDER_MODES } from './src/exercises/orderSyllablesConfig.js';

const refs = {
  appRoot: document.querySelector('#app-root'),
  homeScreen: document.querySelector('#home-screen'),
  exerciseScreen: document.querySelector('#exercise-screen'),
  homeBtn: document.querySelector('#home-btn'),
  levelButtons: document.querySelectorAll('.level-btn'),
  modeButtons: document.querySelectorAll('.mode-btn'),
  exerciseContainer: document.querySelector('#exercise-container'),
  feedback: document.querySelector('#feedback'),
  score: document.querySelector('#score'),
  roundWord: document.querySelector('#round-word'),
  levelLabel: document.querySelector('#level-label'),
  nextBtn: document.querySelector('#next-btn')
};

const POSITION_PATTERNS = {
  2: ['slot-a', 'slot-d'],
  3: ['slot-a', 'slot-c', 'slot-e'],
  4: ['slot-a', 'slot-b', 'slot-d', 'slot-f']
};

const state = { activeExerciseId: null, currentLevel: 1, currentMode: 'normal' };
const registry = createExerciseRegistry();
registry.register(createOrderSyllablesPlugin());

const router = createRouter({ root: refs.appRoot, views: { home: refs.homeScreen, exercise: refs.exerciseScreen } });

function setFeedback(message, type = '') {
  refs.feedback.textContent = message;
  refs.feedback.className = `feedback ${type ? `is-${type}` : ''}`;
}

function getLayoutClass(pieceCount) {
  return POSITION_PATTERNS[pieceCount] ?? POSITION_PATTERNS[3];
}

function updateAnswerSlots(answer = []) {
  const slots = refs.exerciseContainer.querySelectorAll('.answer-slot');
  slots.forEach((slot, index) => {
    slot.textContent = answer[index]?.toUpperCase() ?? '';
  });
}

function renderRound(viewModel) {
  if (!viewModel || viewModel.status !== 'ready') {
    refs.exerciseContainer.innerHTML = '';
    setFeedback('No hay palabras disponibles con esos filtros.', 'error');
    return;
  }

  refs.levelLabel.textContent = viewModel.levelLabel;
  refs.roundWord.textContent = `${viewModel.expectedLength} sílabas · ${viewModel.modeLabel}`;

  const piecesWrap = document.createElement('div');
  piecesWrap.className = 'pieces-cloud';
  const slots = getLayoutClass(viewModel.pieces.length);

  viewModel.pieces.forEach((piece, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `syllable-piece ${slots[index] ?? 'slot-c'}`;
    button.textContent = piece.text.toUpperCase();
    button.dataset.syllable = piece.text;
    button.setAttribute('aria-label', `Sílaba ${piece.text.toUpperCase()}`);
    button.addEventListener('click', () => handleSyllableTap(button));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSyllableTap(button);
      }
    });
    piecesWrap.appendChild(button);
  });

  const answerWrap = document.createElement('div');
  answerWrap.className = 'answer-zone';
  answerWrap.innerHTML = '<p class="answer-zone__label">Construye la palabra</p>';

  const slotsWrap = document.createElement('div');
  slotsWrap.className = 'answer-slots';
  for (let index = 0; index < viewModel.expectedLength; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'answer-slot';
    slot.dataset.index = String(index);
    slot.setAttribute('aria-hidden', 'true');
    slotsWrap.appendChild(slot);
  }

  answerWrap.appendChild(slotsWrap);
  refs.exerciseContainer.innerHTML = '';
  refs.exerciseContainer.append(piecesWrap, answerWrap);
  updateAnswerSlots(viewModel.answer);
  piecesWrap.querySelector('.syllable-piece')?.focus();
}

function getActivePlugin() {
  return registry.get(state.activeExerciseId);
}

function handleSyllableTap(button) {
  const plugin = getActivePlugin();
  if (!plugin) return;

  const result = plugin.submit({ type: 'tap', syllable: button.dataset.syllable });

  if (result.status === 'error') {
    button.classList.remove('is-wrong');
    void button.offsetWidth;
    button.classList.add('is-wrong');
    setFeedback('Esa no va ahí. Inténtalo de nuevo.', 'error');
    return;
  }

  if (result.answer) {
    updateAnswerSlots(result.answer);
  }

  if (result.status === 'progress') {
    button.classList.remove('is-correct');
    void button.offsetWidth;
    button.classList.add('is-correct');
    setFeedback('¡Bien! Sigue.', 'success');
    return;
  }

  if (result.status === 'correct') {
    refs.score.textContent = String(result.score);
    setFeedback('Excelente. Nueva palabra…', 'success');
    window.setTimeout(startRound, 900);
  }
}

function startRound() {
  const plugin = getActivePlugin();
  if (!plugin) return;
  renderRound(plugin.start({ level: state.currentLevel, mode: state.currentMode }));
  setFeedback('Toca las sílabas en orden para formar una palabra.', '');
}

function setLevel(level) {
  state.currentLevel = level;
  refs.levelButtons.forEach((btn) => btn.classList.toggle('is-active', Number(btn.dataset.level) === level));
  const plugin = getActivePlugin();
  renderRound(plugin.start({ level, mode: state.currentMode }));
  setFeedback('Toca las sílabas en orden para formar una palabra.', '');
}

function setMode(mode) {
  const modeConfig = ORDER_MODES[mode] ?? ORDER_MODES.normal;
  if (!modeConfig.enabled) {
    setFeedback('Este modo estará disponible próximamente.', 'error');
    return;
  }

  state.currentMode = modeConfig.id;
  refs.modeButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.mode === modeConfig.id));
  const plugin = getActivePlugin();
  if (!plugin) return;
  renderRound(plugin.start({ level: state.currentLevel, mode: state.currentMode }));
  setFeedback('Toca las sílabas en orden para formar una palabra.', '');
}

function openExercise(exerciseId) {
  const plugin = registry.get(exerciseId);
  if (!plugin) {
    return;
  }

  state.activeExerciseId = exerciseId;
  router.navigateExercise();
  document.body.classList.add('is-activity-mode');
  refs.score.textContent = '0';
  plugin.start({ level: 1, mode: 'normal', resetScore: true });
  setLevel(1);
}

function init() {
  validateWords(WORDS);

  const homeController = createHomeController({ homeScreen: refs.homeScreen, onSelectExercise: openExercise });
  homeController.bindEvents();

  refs.levelButtons.forEach((button) => {
    button.addEventListener('click', () => setLevel(Number(button.dataset.level)));
  });

  refs.modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  refs.nextBtn.addEventListener('click', startRound);
  refs.nextBtn.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startRound();
    }
  });

  refs.homeBtn.addEventListener('click', () => {
    router.navigateHome();
    document.body.classList.remove('is-activity-mode');
    setFeedback('');
  });

  router.init('home');
  document.body.classList.remove('is-activity-mode');
}

init();
