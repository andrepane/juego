import { WORDS } from '../data/words.js';
import { createCountSyllablesExercise } from '../exercises/countSyllables.js';
import { createInitialSyllableExercise } from '../exercises/initialSyllable.js';
import { createOrderSyllablesExercise } from '../exercises/orderSyllables.js';
import { getRandomWord } from './utils.js';

const EXERCISE_BUILDERS = {
  count: (word) => createCountSyllablesExercise(word),
  initial: (word) => createInitialSyllableExercise(word, WORDS),
  order: (word) => createOrderSyllablesExercise(word)
};

export function createExerciseEngine(words = WORDS) {
  const engineState = {
    score: 0,
    currentDifficulty: 1,
    currentRound: null
  };

  function setDifficulty(level) {
    engineState.currentDifficulty = level;
  }

  function generateRound(exerciseId) {
    const word = getRandomWord(words, { difficulty: engineState.currentDifficulty });
    const exerciseData = EXERCISE_BUILDERS[exerciseId](word);

    engineState.currentRound = {
      exerciseId,
      difficulty: engineState.currentDifficulty,
      word,
      exerciseData
    };

    return engineState.currentRound;
  }

  function validateAnswer(answer) {
    if (!engineState.currentRound) {
      return { isCorrect: false, expectedAnswer: null, score: engineState.score };
    }

    const { exerciseData } = engineState.currentRound;
    const isCorrect = answer === exerciseData.correctAnswer;

    if (isCorrect) {
      engineState.score += 1;
    }

    return { isCorrect, expectedAnswer: exerciseData.correctAnswer, score: engineState.score };
  }

  return {
    setDifficulty,
    generateRound,
    validateAnswer,
    getScore: () => engineState.score,
    getState: () => ({ ...engineState })
  };
}
