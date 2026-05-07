import { state, resetAnswerState } from './src/core/state.js';
import { getRandomItem } from './src/core/utils.js';
import { WORDS } from './src/data/words.js';
import { createCountSyllablesExercise } from './src/exercises/countSyllables.js';
import { createInitialSyllableExercise } from './src/exercises/initialSyllable.js';
import { createOrderSyllablesExercise } from './src/exercises/orderSyllables.js';
import { renderExerciseMeta, renderQuestionUI, setFeedback } from './src/ui/render.js';

const EXERCISES = {
  count: { title: 'Contar sílabas', type: 'Conciencia silábica' },
  initial: { title: 'Sílaba inicial', type: 'Conciencia silábica' },
  order: { title: 'Ordenar sílabas', type: 'Conciencia silábica' }
};

const refs = {
  exerciseCards: document.querySelectorAll('.exercise-card'),
  exerciseType: document.querySelector('#exercise-type'),
  exerciseTitle: document.querySelector('#exercise-title'),
  exerciseContainer: document.querySelector('#exercise-container'),
  checkBtn: document.querySelector('#check-btn'),
  nextBtn: document.querySelector('#next-btn'),
  feedback: document.querySelector('#feedback'),
  score: document.querySelector('#score')
};

let currentExerciseData = null;

function buildExerciseData() {
  if (state.currentExercise === 'count') {
    return createCountSyllablesExercise(state.currentWord);
  }

  if (state.currentExercise === 'initial') {
    return createInitialSyllableExercise(state.currentWord, WORDS);
  }

  return createOrderSyllablesExercise(state.currentWord);
}

function generateNewRound() {
  resetAnswerState();
  setFeedback(refs, '', '');
  state.currentWord = getRandomItem(WORDS);

  renderExerciseMeta(refs, EXERCISES[state.currentExercise]);

  currentExerciseData = buildExerciseData();
  renderQuestionUI({ refs, exerciseData: currentExerciseData, state });
}

function checkAnswer() {
  let userAnswer = state.selectedAnswer;

  if (state.currentExercise === 'order') {
    userAnswer = state.orderedSyllables.join('-');
  }

  const isCorrect = userAnswer === currentExerciseData.correctAnswer;

  if (isCorrect) {
    state.score += 1;
    refs.score.textContent = state.score;
    setFeedback(refs, 'Correcto. Muy bien.', 'success');
    return;
  }

  setFeedback(refs, 'No todavía. Prueba otra vez.', 'error');
}

function changeExercise(exerciseId) {
  state.currentExercise = exerciseId;

  refs.exerciseCards.forEach((card) => {
    card.classList.toggle('is-active', card.dataset.exercise === exerciseId);
  });

  generateNewRound();
}

function initEvents() {
  refs.exerciseCards.forEach((card) => {
    card.addEventListener('click', () => changeExercise(card.dataset.exercise));
  });

  refs.checkBtn.addEventListener('click', checkAnswer);
  refs.nextBtn.addEventListener('click', generateNewRound);
}

function initApp() {
  initEvents();
  generateNewRound();
}

initApp();
