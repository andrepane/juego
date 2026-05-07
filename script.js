const WORDS = [
  { word: "casa", syllables: ["ca", "sa"], level: 1 },
  { word: "mesa", syllables: ["me", "sa"], level: 1 },
  { word: "sapo", syllables: ["sa", "po"], level: 1 },
  { word: "pelota", syllables: ["pe", "lo", "ta"], level: 2 },
  { word: "camino", syllables: ["ca", "mi", "no"], level: 2 },
  { word: "zapato", syllables: ["za", "pa", "to"], level: 2 },
  { word: "mariposa", syllables: ["ma", "ri", "po", "sa"], level: 3 },
  { word: "caramelo", syllables: ["ca", "ra", "me", "lo"], level: 3 },
  { word: "helicóptero", syllables: ["he", "li", "cóp", "te", "ro"], level: 4 }
];

const EXERCISES = {
  count: {
    title: "Contar sílabas",
    type: "Conciencia silábica"
  },
  initial: {
    title: "Sílaba inicial",
    type: "Conciencia silábica"
  },
  order: {
    title: "Ordenar sílabas",
    type: "Conciencia silábica"
  }
};

const state = {
  currentExercise: "count",
  currentWord: null,
  selectedAnswer: null,
  orderedSyllables: [],
  score: 0
};

const refs = {
  exerciseCards: document.querySelectorAll(".exercise-card"),
  exerciseType: document.querySelector("#exercise-type"),
  exerciseTitle: document.querySelector("#exercise-title"),
  exerciseContainer: document.querySelector("#exercise-container"),
  checkBtn: document.querySelector("#check-btn"),
  nextBtn: document.querySelector("#next-btn"),
  feedback: document.querySelector("#feedback"),
  score: document.querySelector("#score")
};

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function setFeedback(message, type) {
  refs.feedback.textContent = message;
  refs.feedback.className = `feedback ${type ? `is-${type}` : ""}`;
}

function resetAnswerState() {
  state.selectedAnswer = null;
  state.orderedSyllables = [];
  setFeedback("", "");
}

function generateNewRound() {
  resetAnswerState();
  state.currentWord = getRandomItem(WORDS);

  const exercise = EXERCISES[state.currentExercise];

  refs.exerciseType.textContent = exercise.type;
  refs.exerciseTitle.textContent = exercise.title;

  if (state.currentExercise === "count") {
    renderCountExercise();
  }

  if (state.currentExercise === "initial") {
    renderInitialSyllableExercise();
  }

  if (state.currentExercise === "order") {
    renderOrderSyllablesExercise();
  }
}

function renderWordCard(label = "Palabra") {
  return `
    <div class="word-card">
      <p class="word-card__label">${label}</p>
      <p class="word-card__word">${state.currentWord.word}</p>
    </div>
  `;
}

function renderCountExercise() {
  refs.exerciseContainer.innerHTML = `
    ${renderWordCard("¿Cuántas sílabas tiene?")}

    <div class="options-grid">
      ${[1, 2, 3, 4, 5].map(number => `
        <button class="option-btn" data-answer="${number}">
          ${number}
        </button>
      `).join("")}
    </div>
  `;

  bindOptionButtons();
}

function renderInitialSyllableExercise() {
  const correct = state.currentWord.syllables[0];

  const distractors = WORDS
    .flatMap(item => item.syllables)
    .filter(syllable => syllable !== correct);

  const options = shuffleArray([
    correct,
    ...shuffleArray(distractors).slice(0, 3)
  ]);

  refs.exerciseContainer.innerHTML = `
    ${renderWordCard("¿Por qué sílaba empieza?")}

    <div class="options-grid">
      ${options.map(option => `
        <button class="option-btn" data-answer="${option}">
          ${option}
        </button>
      `).join("")}
    </div>
  `;

  bindOptionButtons();
}

function renderOrderSyllablesExercise() {
  const shuffledSyllables = shuffleArray(state.currentWord.syllables);

  refs.exerciseContainer.innerHTML = `
    ${renderWordCard("Ordena las sílabas")}

    <div>
      <p class="word-card__label">Sílabas disponibles</p>
      <div class="syllable-bank" id="syllable-bank">
        ${shuffledSyllables.map((syllable, index) => `
          <button class="syllable-btn" data-syllable="${syllable}" data-index="${index}">
            ${syllable}
          </button>
        `).join("")}
      </div>
    </div>

    <div>
      <p class="word-card__label">Tu respuesta</p>
      <div class="answer-bank" id="answer-bank"></div>
    </div>
  `;

  bindSyllableButtons();
}

function bindOptionButtons() {
  const buttons = refs.exerciseContainer.querySelectorAll(".option-btn");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(btn => btn.classList.remove("is-selected"));

      button.classList.add("is-selected");
      state.selectedAnswer = button.dataset.answer;
    });
  });
}

function bindSyllableButtons() {
  const buttons = refs.exerciseContainer.querySelectorAll(".syllable-btn");
  const answerBank = refs.exerciseContainer.querySelector("#answer-bank");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const syllable = button.dataset.syllable;

      state.orderedSyllables.push(syllable);
      button.disabled = true;
      button.classList.add("is-selected");

      const selectedButton = document.createElement("button");
      selectedButton.className = "syllable-btn is-selected";
      selectedButton.textContent = syllable;
      selectedButton.type = "button";

      selectedButton.addEventListener("click", () => {
        state.orderedSyllables = state.orderedSyllables.filter((item, index) => {
          return index !== state.orderedSyllables.indexOf(syllable);
        });

        button.disabled = false;
        button.classList.remove("is-selected");
        selectedButton.remove();
      });

      answerBank.appendChild(selectedButton);
    });
  });
}

function checkAnswer() {
  let isCorrect = false;

  if (state.currentExercise === "count") {
    isCorrect = Number(state.selectedAnswer) === state.currentWord.syllables.length;
  }

  if (state.currentExercise === "initial") {
    isCorrect = state.selectedAnswer === state.currentWord.syllables[0];
  }

  if (state.currentExercise === "order") {
    isCorrect = state.orderedSyllables.join("-") === state.currentWord.syllables.join("-");
  }

  if (isCorrect) {
    state.score++;
    refs.score.textContent = state.score;
    setFeedback("Correcto. Muy bien.", "success");
  } else {
    setFeedback("No todavía. Prueba otra vez.", "error");
  }
}

function changeExercise(exerciseId) {
  state.currentExercise = exerciseId;

  refs.exerciseCards.forEach(card => {
    card.classList.toggle("is-active", card.dataset.exercise === exerciseId);
  });

  generateNewRound();
}

function initEvents() {
  refs.exerciseCards.forEach(card => {
    card.addEventListener("click", () => {
      changeExercise(card.dataset.exercise);
    });
  });

  refs.checkBtn.addEventListener("click", checkAnswer);
  refs.nextBtn.addEventListener("click", generateNewRound);
}

function initApp() {
  initEvents();
  generateNewRound();
}

initApp();
