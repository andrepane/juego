const VIEWS = {
  home: 'home',
  exercise: 'exercise'
};

export function createRouter({ views, root }) {
  const state = {
    activeView: VIEWS.home,
    isAnimating: false
  };

  const TRANSITION_MS = 220;

  function render() {
    Object.entries(views).forEach(([viewName, element]) => {
      const isActive = state.activeView === viewName;
      element.classList.toggle('is-active-view', isActive);
      element.classList.toggle('is-inactive-view', !isActive);
      element.setAttribute('aria-hidden', String(!isActive));
    });

    const isExerciseMode = state.activeView === VIEWS.exercise;
    root.classList.toggle('is-exercise-mode', isExerciseMode);
    document.body.classList.toggle('is-exercise-mode', isExerciseMode);
  }

  function navigate(nextView) {
    if (!views[nextView] || state.activeView === nextView || state.isAnimating) {
      return;
    }

    state.isAnimating = true;
    root.classList.add('is-transitioning');
    state.activeView = nextView;
    render();

    window.setTimeout(() => {
      root.classList.remove('is-transitioning');
      state.isAnimating = false;
    }, TRANSITION_MS);
  }

  function init(initialView = VIEWS.home) {
    if (views[initialView]) {
      state.activeView = initialView;
    }
    render();
  }

  return {
    init,
    navigateHome: () => navigate(VIEWS.home),
    navigateExercise: () => navigate(VIEWS.exercise),
    getActiveView: () => state.activeView
  };
}
