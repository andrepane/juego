import { createExerciseEngine } from './src/core/exerciseEngine.js';
import { state, resetAnswerState } from './src/core/state.js';
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

const engine = createExerciseEngine();
let currentExerciseData = null;

function generateNewRound() {
  resetAnswerState();
  setFeedback(refs, '', '');

  renderExerciseMeta(refs, EXERCISES[state.currentExercise]);

  const round = engine.generateRound(state.currentExercise);
  currentExerciseData = round.exerciseData;
  renderQuestionUI({ refs, exerciseData: currentExerciseData, state });
}

function checkAnswer() {
  const userAnswer =
    state.currentExercise === 'order' ? state.orderedSyllables.join('-') : state.selectedAnswer;

  const result = engine.validateAnswer(userAnswer);

  if (result.isCorrect) {
    refs.score.textContent = result.score;
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
  engine.setDifficulty(1);
  initEvents();
  generateNewRound();
}

initApp();
