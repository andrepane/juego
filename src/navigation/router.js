const VIEWS = {
  home: 'home',
  exercise: 'exercise'
};

export function createRouter({ views, initialView = VIEWS.home }) {
  let currentView = initialView;

  function render(view) {
    currentView = view;

    Object.entries(views).forEach(([viewId, node]) => {
      const isActive = viewId === view;
      node.hidden = !isActive;
      node.classList.toggle('is-active-view', isActive);
    });
  }

  function goTo(view) {
    if (!views[view]) {
      return;
    }

    render(view);
  }

  render(initialView);

  return {
    goTo,
    showHome: () => goTo(VIEWS.home),
    showExercise: () => goTo(VIEWS.exercise),
    getCurrentView: () => currentView,
    views: VIEWS
  };
}
