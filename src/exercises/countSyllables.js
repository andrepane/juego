import { generateNumericDistractors } from '../core/utils.js';

export function createCountSyllablesExercise(word) {
  return {
    type: 'multiple-choice',
    question: '¿Cuántas sílabas tiene?',
    options: generateNumericDistractors(word.syllableCount, 1, 5, 5).map(String),
    correctAnswer: String(word.syllableCount),
    word,
    exerciseId: 'count'
  };
}
