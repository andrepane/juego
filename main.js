import { createMetalinguisticEngine } from './src/core/metalinguisticEngine.js';

const engine = createMetalinguisticEngine();

const refs = {
  home: document.querySelector('#home'),
  metalinguistica: document.querySelector('#metalinguistica'),
  startBtn: document.querySelector('#start-btn'),
  exitBtn: document.querySelector('#exit-btn'),
  input: document.querySelector('#base-word'),
  generateBtn: document.querySelector('#generate-btn'),
  basePreview: document.querySelector('#base-preview'),
  challengeList: document.querySelector('#challenge-list')
};

function goTo(view) {
  refs.home.classList.toggle('is-active', view === 'home');
  refs.metalinguistica.classList.toggle('is-active', view === 'metalinguistica');
  document.body.classList.toggle('is-activity-mode', view === 'metalinguistica');
}

function renderBase(word, syllables) {
  refs.basePreview.innerHTML = `
    <article class="base-card">
      <p class="label">Palabra base</p>
      <h3>${word}</h3>
      <p class="meta">Sílabas detectadas: ${syllables.join(' · ') || '—'}</p>
      <p class="meta">Letras: ${[...word].join(' - ')}</p>
    </article>
  `;
}

function renderChallenges(challenges) {
  refs.challengeList.innerHTML = '';

  challenges.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'challenge-card';
    card.innerHTML = `
      <p class="label">Dinámica ${index + 1} · ${item.type}</p>
      <p class="task">${item.prompt}</p>
      <p class="source">Base: <strong>${item.source}</strong></p>
      <p class="result">Resultado esperado: <strong>${item.result}</strong></p>
    `;
    refs.challengeList.appendChild(card);
  });
}

function regenerate() {
  const raw = refs.input.value;
  const word = engine.normalizeInput(raw);
  refs.input.value = word;

  const syllables = engine.splitSyllables(word);
  const challenges = engine.buildChallenges(word);

  renderBase(word || '—', syllables);
  renderChallenges(challenges);
}

refs.startBtn.addEventListener('click', () => {
  goTo('metalinguistica');
  regenerate();
});

refs.exitBtn.addEventListener('click', () => goTo('home'));
refs.generateBtn.addEventListener('click', regenerate);
refs.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    regenerate();
  }
});

goTo('home');
