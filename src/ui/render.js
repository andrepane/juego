import { createButton, createOptionsGrid, createWordCard } from './components.js';

export function renderExerciseMeta(refs, exerciseMeta) {
  refs.exerciseType.textContent = exerciseMeta.type;
  refs.exerciseTitle.textContent = exerciseMeta.title;
}

export function setFeedback(refs, message, type) {
  refs.feedback.textContent = message;
  refs.feedback.className = `feedback ${type ? `is-${type}` : ''}`;
}

export function renderQuestionUI({ refs, exerciseData, state }) {
  refs.exerciseContainer.innerHTML = '';
  refs.exerciseContainer.appendChild(
    createWordCard({ label: exerciseData.question, word: exerciseData.word.word })
  );

  if (exerciseData.type === 'multiple-choice') {
    refs.exerciseContainer.appendChild(createOptionsGrid(exerciseData.options));
    bindOptionButtons(refs, state);
  }

  if (exerciseData.type === 'order-syllables') {
    renderOrderSyllablesLayout({ refs, exerciseData, state });
  }
}

function bindOptionButtons(refs, state) {
  const buttons = refs.exerciseContainer.querySelectorAll('.option-btn');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((btn) => btn.classList.remove('is-selected'));
      button.classList.add('is-selected');
      state.selectedAnswer = button.dataset.answer;
    });
  });
}

function renderOrderSyllablesLayout({ refs, exerciseData, state }) {
  const bankWrap = document.createElement('div');
  const bankTitle = document.createElement('p');
  bankTitle.className = 'word-card__label';
  bankTitle.textContent = 'Sílabas disponibles';

  const syllableBank = document.createElement('div');
  syllableBank.className = 'syllable-bank';
  syllableBank.id = 'syllable-bank';

  exerciseData.options.forEach((syllable, index) => {
    const syllableButton = createButton({
      className: 'syllable-btn',
      label: syllable,
      dataset: { syllable, index }
    });
    syllableBank.appendChild(syllableButton);
  });

  bankWrap.append(bankTitle, syllableBank);

  const answerWrap = document.createElement('div');
  const answerTitle = document.createElement('p');
  answerTitle.className = 'word-card__label';
  answerTitle.textContent = 'Tu respuesta';

  const answerBank = document.createElement('div');
  answerBank.className = 'answer-bank';
  answerBank.id = 'answer-bank';

  answerWrap.append(answerTitle, answerBank);

  refs.exerciseContainer.append(bankWrap, answerWrap);
  bindSyllableButtons({ refs, state, answerBank });
}

function bindSyllableButtons({ refs, state, answerBank }) {
  const buttons = refs.exerciseContainer.querySelectorAll('.syllable-btn');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const syllable = button.dataset.syllable;

      state.orderedSyllables.push(syllable);
      button.disabled = true;
      button.classList.add('is-selected');

      const selectedButton = createButton({ className: 'syllable-btn is-selected', label: syllable });

      selectedButton.addEventListener('click', () => {
        const syllableIndex = state.orderedSyllables.indexOf(syllable);

        if (syllableIndex !== -1) {
          state.orderedSyllables.splice(syllableIndex, 1);
        }

        button.disabled = false;
        button.classList.remove('is-selected');
        selectedButton.remove();
      });

      answerBank.appendChild(selectedButton);
    });
  });
}
