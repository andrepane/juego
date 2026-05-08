export function createHomeController({ homeScreen, onSelectExercise }) {
  const cards = homeScreen.querySelectorAll('[data-exercise]');

  function bindEvents() {
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        if (card.disabled || card.dataset.status === 'coming-soon') {
          return;
        }

        onSelectExercise(card.dataset.exercise);
      });
    });
  }

  return { bindEvents };
}
