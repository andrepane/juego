export const state = {
  currentExercise: 'count',
  currentWord: null,
  selectedAnswer: null,
  orderedSyllables: [],
  score: 0
};

export function resetAnswerState() {
  state.selectedAnswer = null;
  state.orderedSyllables = [];
}
