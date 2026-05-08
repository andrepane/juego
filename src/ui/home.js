export function createHomeController({ homeScreen, onSelectExercise }) {
  const cards = homeScreen.querySelectorAll('[data-exercise]');

  function bindEvents() {
    cards.forEach((card) => {
      const isAvailable = card.dataset.available === 'true';

      if (!isAvailable) {
        card.setAttribute('aria-disabled', 'true');
        return;
      }

      card.addEventListener('click', () => {
        const exerciseId = card.dataset.exercise;
        onSelectExercise(exerciseId);
      });
    });
  }

  return { bindEvents };
}
