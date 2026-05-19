export function createHomeController({ homeScreen, onSelectExercise, onOpenAdmin }) {
  const cards = homeScreen.querySelectorAll('[data-exercise]');
  const adminLink = homeScreen.querySelector('[data-open-admin]');

  function bindEvents() {
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        if (card.disabled || card.dataset.status === 'coming-soon') {
          return;
        }

        onSelectExercise(card.dataset.exercise);
      });
    });

    adminLink?.addEventListener('click', (event) => {
      event.preventDefault();
      onOpenAdmin();
    });
  }

  return { bindEvents };
}
