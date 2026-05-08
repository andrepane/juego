const SCREENS = {
  home: 'home',
  exercise: 'exercise'
};

export function createRouter({ homeScreen, exerciseScreen }) {
  function show(screen) {
    const showHome = screen === SCREENS.home;
    homeScreen.classList.toggle('is-hidden', !showHome);
    exerciseScreen.classList.toggle('is-hidden', showHome);
  }

  return {
    showHome: () => show(SCREENS.home),
    showExercise: () => show(SCREENS.exercise)
  };
}
