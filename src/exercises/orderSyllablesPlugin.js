import { getFilteredWords, getRandomWord, shuffleArray } from '../core/wordUtils.js';
import { createRecentHistory } from '../core/recentHistory.js';

export const ORDER_LEVELS = {
  1: {
    id: 1,
    label: 'Nivel 1',
    filters: {
      syllableCount: 2,
      frequency: [1, 2],
      structure: ['CV-CV']
    }
  },
  2: {
    id: 2,
    label: 'Nivel 2',
    filters: {
      syllableCount: 3,
      frequency: [1, 2],
      structure: ['CV-CV-CV']
    }
  },
  3: {
    id: 3,
    label: 'Nivel 3',
    filters: {
      syllableCount: 3,
      frequency: 3
    }
  }
};

function createSyllablePieces(syllables) {
  return shuffleArray(syllables).map((text, index) => ({ id: `${text}-${index}`, text }));
}

function classifyError({ expected, tapped, submitted, target }) {
  if (tapped && expected && tapped !== expected) {
    return 'orden_incorrecto';
  }

  if (!submitted || !target) {
    return 'orden_incorrecto';
  }

  if (submitted.length < target.length) {
    return 'omision';
  }

  const sameItems = [...submitted].sort().join('|') === [...target].sort().join('|');
  if (submitted.length === target.length && sameItems && submitted.join('-') !== target.join('-')) {
    return 'inversion';
  }

  return 'orden_incorrecto';
}

export function createOrderSyllablesPlugin() {
  const state = {
    level: 1,
    round: null,
    answer: [],
    score: 0,
    metrics: {
      roundsPlayed: 0,
      roundsCorrect: 0,
      errorsByType: {
        inversion: 0,
        omision: 0,
        orden_incorrecto: 0
      }
    }
  };

  const recentHistory = createRecentHistory(10);

  function getCandidates(level) {
    const config = ORDER_LEVELS[level] ?? ORDER_LEVELS[1];
    const all = getFilteredWords(config.filters);
    const fresh = all.filter((word) => !recentHistory.has(word.id));

    return {
      config,
      pool: fresh.length > 0 ? fresh : all
    };
  }

  function makeRound(level = state.level) {
    const { config, pool } = getCandidates(level);
    const word = getRandomWord(pool);

    if (!word) {
      return null;
    }

    return {
      level: config.id,
      levelLabel: config.label,
      word: {
        id: word.id,
        text: word.word,
        syllables: [...word.syllables]
      },
      pieces: createSyllablePieces(word.syllables),
      expectedLength: word.syllables.length,
      correctAnswer: word.syllables.join('-')
    };
  }

  function start(payload = {}) {
    if (Number.isInteger(payload.level)) {
      state.level = payload.level;
    }

    if (payload.resetScore) {
      state.score = 0;
      state.metrics.roundsPlayed = 0;
      state.metrics.roundsCorrect = 0;
      state.metrics.errorsByType = { inversion: 0, omision: 0, orden_incorrecto: 0 };
      recentHistory.clear();
    }

    state.answer = [];
    state.round = makeRound(state.level);

    if (!state.round) {
      return { status: 'empty' };
    }

    state.metrics.roundsPlayed += 1;

    return {
      status: 'ready',
      level: state.round.level,
      levelLabel: state.round.levelLabel,
      expectedLength: state.round.expectedLength,
      pieces: state.round.pieces,
      wordId: state.round.word.id,
      answer: []
    };
  }

  function submit(payload = {}) {
    if (!state.round) {
      return { status: 'empty' };
    }

    if (payload.type === 'tap') {
      const tapped = payload.syllable;
      if (state.answer.length >= state.round.expectedLength) {
        return { status: 'locked', answer: [...state.answer] };
      }

      const expected = state.round.word.syllables[state.answer.length];

      if (tapped !== expected) {
        const errorType = classifyError({ tapped, expected });
        state.metrics.errorsByType[errorType] += 1;
        return {
          status: 'error',
          errorType,
          expected,
          answer: [...state.answer]
        };
      }

      state.answer.push(tapped);
      if (state.answer.length === state.round.expectedLength) {
        return submit({ type: 'validate' });
      }

      return {
        status: 'progress',
        answer: [...state.answer],
        completed: false
      };
    }

    if (payload.type === 'validate') {
      const success = state.answer.join('-') === state.round.correctAnswer;

      if (!success) {
        const errorType = classifyError({ submitted: state.answer, target: state.round.word.syllables });
        state.metrics.errorsByType[errorType] += 1;
        return {
          status: 'incorrect',
          errorType,
          answer: [...state.answer],
          targetLength: state.round.expectedLength
        };
      }

      state.score += 1;
      state.metrics.roundsCorrect += 1;
      recentHistory.add(state.round.word.id);

      return {
        status: 'correct',
        score: state.score,
        answer: [...state.answer],
        wordId: state.round.word.id
      };
    }

    return { status: 'idle' };
  }

  function next(payload = {}) {
    if (payload.level !== undefined) {
      state.level = payload.level;
    }
    return start({ level: state.level });
  }

  return {
    id: 'order-syllables',
    start,
    submit,
    next,
    getMetrics: () => ({
      score: state.score,
      roundsPlayed: state.metrics.roundsPlayed,
      roundsCorrect: state.metrics.roundsCorrect,
      errorsByType: { ...state.metrics.errorsByType },
      recentWordIds: recentHistory.snapshot()
    })
  };
}
