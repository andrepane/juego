import { createOption } from '../core/utils.js';
import { getAllWords, shuffleArray } from '../core/wordUtils.js';

export function createInitialSyllableExercise(word) {
  const distractors = [...new Set(getAllWords().flatMap((item) => item.syllables))].filter(
    (syllable) => syllable !== word.initialSyllable
  );

  const selectedOptions = shuffleArray([word.initialSyllable, ...shuffleArray(distractors).slice(0, 2)]);
  const options = selectedOptions.map((value, index) => createOption(String.fromCharCode(97 + index), value));
  const correctOption = options.find((option) => option.label === word.initialSyllable);

  return {
    type: 'multiple-choice',
    title: '¿Por qué sílaba empieza?',
    prompt: 'Selecciona la sílaba inicial correcta',
    word: { text: word.word, id: word.id },
    options,
    correctAnswer: correctOption.id,
    exerciseId: 'initial'
  };
}
