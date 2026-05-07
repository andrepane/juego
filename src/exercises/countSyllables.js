import { createOption, generateNumericDistractors } from '../core/utils.js';

export function createCountSyllablesExercise(word) {
  const numericOptions = generateNumericDistractors(word.syllableCount, 1, 6, 3);
  const options = numericOptions.map((value, index) => createOption(String.fromCharCode(97 + index), value));
  const correctOption = options.find((option) => Number(option.label) === word.syllableCount);

  return {
    type: 'multiple-choice',
    title: '¿Cuántas sílabas tiene?',
    prompt: 'Selecciona la respuesta correcta',
    word: { text: word.word, id: word.id },
    options,
    correctAnswer: correctOption.id,
    exerciseId: 'count'
  };
}
