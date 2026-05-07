export const state = {
  currentExercise: 'count',
  selectedAnswer: null,
  orderedSyllables: []
};

export function resetAnswerState() {
  state.selectedAnswer = null;
  state.orderedSyllables = [];
}
