export function createButton({ className, label, value, dataset = {} }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;

  if (value !== undefined) {
    button.dataset.answer = String(value);
  }

  Object.entries(dataset).forEach(([key, datasetValue]) => {
    button.dataset[key] = String(datasetValue);
  });

  return button;
}

export function createWordCard({ label, word }) {
  const card = document.createElement('div');
  card.className = 'word-card';

  const cardLabel = document.createElement('p');
  cardLabel.className = 'word-card__label';
  cardLabel.textContent = label;

  const cardWord = document.createElement('p');
  cardWord.className = 'word-card__word';
  cardWord.textContent = word;

  card.append(cardLabel, cardWord);
  return card;
}

export function createOptionsGrid(options) {
  const grid = document.createElement('div');
  grid.className = 'options-grid';

  options.forEach((option) => {
    grid.appendChild(
      createButton({
        className: 'option-btn',
        label: option,
        value: option
      })
    );
  });

  return grid;
}
