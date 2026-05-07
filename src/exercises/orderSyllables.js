import { shuffleArray } from '../core/utils.js';

export function createOrderSyllablesExercise(word) {
  return {
    type: 'order-syllables',
    question: 'Ordena las sílabas',
    options: shuffleArray(word.syllables),
    correctAnswer: word.syllables.join('-'),
    word,
    exerciseId: 'order'
  };
}
