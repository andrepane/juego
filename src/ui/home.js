export function createHomeController({ homeScreen, onSelectExercise }) {
  const cards = homeScreen.querySelectorAll('[data-exercise]');

  function bindEvents() {
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const exerciseId = card.dataset.exercise;
        onSelectExercise(exerciseId);
      });
    });
  }

  return { bindEvents };
}
