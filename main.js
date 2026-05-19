import { createMetalinguisticEngine } from './src/core/metalinguisticEngine.js';

const engine = createMetalinguisticEngine();

const refs = {
  home: document.querySelector('#home'),
  activity: document.querySelector('#metalinguistica'),
  startBtn: document.querySelector('#start-btn'),
  exitBtn: document.querySelector('#exit-btn'),
  inputWord: document.querySelector('#base-word'),
  launchBtn: document.querySelector('#generate-btn'),
  baseWord: document.querySelector('#focus-word'),
  progress: document.querySelector('#progress'),
  prompt: document.querySelector('#prompt'),
  options: document.querySelector('#choice-options'),
  answerInput: document.querySelector('#answer-input'),
  submitBtn: document.querySelector('#submit-answer'),
  feedback: document.querySelector('#feedback'),
  reveal: document.querySelector('#reveal')
};

const state = {
  session: null,
  challengeIndex: 0
};

function goTo(view) {
  refs.home.classList.toggle('is-active', view === 'home');
  refs.activity.classList.toggle('is-active', view === 'activity');
}

function setFeedback(kind, text) {
  refs.feedback.textContent = text;
  refs.feedback.className = `feedback ${kind}`;
}

function currentChallenge() {
  return state.session?.challenges[state.challengeIndex] || null;
}

function renderChallenge() {
  const challenge = currentChallenge();
  if (!challenge) {
    refs.prompt.textContent = 'Sesión completada. Cambia la palabra base para comenzar de nuevo.';
    refs.progress.textContent = 'Completado';
    refs.options.innerHTML = '';
    refs.answerInput.value = '';
    refs.answerInput.classList.add('hidden');
    refs.submitBtn.classList.add('hidden');
    refs.reveal.textContent = '';
    setFeedback('ok', 'Excelente trabajo metalingüístico.');
    return;
  }

  const total = state.session.challenges.length;
  refs.progress.textContent = `Reto ${state.challengeIndex + 1} de ${total}`;
  refs.prompt.textContent = challenge.prompt;
  refs.answerInput.value = '';
  refs.reveal.textContent = '';
  setFeedback('idle', 'Piensa y responde.');

  if (challenge.type === 'choice') {
    refs.options.innerHTML = '';
    refs.options.classList.remove('hidden');
    refs.answerInput.classList.add('hidden');
    refs.submitBtn.classList.add('hidden');

    challenge.options.forEach((option) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = option;
      btn.addEventListener('click', () => attemptAnswer(option));
      refs.options.appendChild(btn);
    });
  } else {
    refs.options.innerHTML = '';
    refs.options.classList.add('hidden');
    refs.answerInput.classList.remove('hidden');
    refs.submitBtn.classList.remove('hidden');
    refs.answerInput.focus();
  }
}

function nextChallenge() {
  state.challengeIndex += 1;
  setTimeout(renderChallenge, 500);
}

function attemptAnswer(rawValue) {
  const challenge = currentChallenge();
  if (!challenge) return;

  const isCorrect = engine.validateAnswer(challenge, rawValue);

  if (isCorrect) {
    setFeedback('ok', '¡Correcto!');
    refs.reveal.textContent = `Resultado: ${challenge.answer}`;
    nextChallenge();
    return;
  }

  setFeedback('error', 'Aún no. Inténtalo de nuevo.');
}

function startSession() {
  const session = engine.buildSession(refs.inputWord.value);
  refs.inputWord.value = session.word;

  if (!session.word || session.challenges.length === 0) {
    setFeedback('error', 'Escribe una palabra o pseudopalabra válida (mínimo 2 letras).');
    return;
  }

  state.session = session;
  state.challengeIndex = 0;
  refs.baseWord.textContent = session.word;
  renderChallenge();
}

refs.startBtn.addEventListener('click', () => {
  goTo('activity');
  startSession();
});

refs.exitBtn.addEventListener('click', () => goTo('home'));
refs.launchBtn.addEventListener('click', startSession);
refs.submitBtn.addEventListener('click', () => attemptAnswer(refs.answerInput.value));
refs.answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    attemptAnswer(refs.answerInput.value);
  }
});

goTo('home');
