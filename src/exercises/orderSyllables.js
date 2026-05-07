import { createOption, shuffleArray } from '../core/utils.js';

export function createOrderSyllablesExercise(word) {
  const shuffled = shuffleArray(word.syllables);
  const options = shuffled.map((value, index) => createOption(`s${index}`, value));

  return {
    type: 'order-syllables',
    title: 'Ordena las sílabas',
    prompt: 'Toca las sílabas en el orden correcto',
    word: { text: word.word, id: word.id },
    options,
    correctAnswer: word.syllables.join('-'),
    exerciseId: 'order'
  };
}
