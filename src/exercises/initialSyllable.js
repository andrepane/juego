import { shuffleArray } from '../core/utils.js';

export function createInitialSyllableExercise(word, words) {
  const distractors = words
    .flatMap((item) => item.syllables)
    .filter((syllable) => syllable !== word.initialSyllable);

  const options = shuffleArray([
    word.initialSyllable,
    ...shuffleArray(distractors).slice(0, 3)
  ]);

  return {
    type: 'multiple-choice',
    question: '¿Por qué sílaba empieza?',
    options,
    correctAnswer: word.initialSyllable,
    word,
    exerciseId: 'initial'
  };
}
