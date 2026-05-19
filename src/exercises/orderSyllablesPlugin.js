import { getFilteredWords, getRandomWord, shuffleArray } from '../core/wordUtils.js';
import { createRecentHistory } from '../core/recentHistory.js';
import { resolveOrderLevel, resolveOrderMode } from './orderSyllablesConfig.js';

function getLinguisticCandidates(levelConfig) {
  const base = getFilteredWords(levelConfig.linguisticFilters);

  if (levelConfig.id !== 3) {
    return base;
  }

  return base.filter((word) => word.structure !== 'CV-CV-CV');
}

function hasSameOrder(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function ensureReorderedSyllables(syllables, previousOrder = null) {
  if (!Array.isArray(syllables) || syllables.length <= 1) {
    return [...syllables];
  }

  const blockedOrders = [syllables, previousOrder].filter(Boolean);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = shuffleArray(syllables);
    const isBlocked = blockedOrders.some((order) => hasSameOrder(candidate, order));

    if (!isBlocked) {
      return candidate;
    }
  }

  const rotated = [...syllables.slice(1), syllables[0]];
  if (!blockedOrders.some((order) => hasSameOrder(rotated, order))) {
    return rotated;
  }

  const reversed = [...syllables].reverse();
  return reversed;
}

function createSyllablePieces(syllables, previousOrder = null) {
  const shuffled = ensureReorderedSyllables(syllables, previousOrder);
  return shuffled.map((text, index) => ({ id: `${text}-${index}`, text }));
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
    mode: 'normal',
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
    },
    lastPiecesOrder: null
  };

  const recentHistory = createRecentHistory(15);

  function getCandidates(level) {
    const config = resolveOrderLevel(level);
    const all = getLinguisticCandidates(config);
    const fresh = all.filter((word) => !recentHistory.has(word.id));

    return {
      config,
      pool: fresh.length > 0 ? fresh : all
    };
  }

  function makeRound(level = state.level) {
    const { config, pool } = getCandidates(level);
    const mode = resolveOrderMode(state.mode);
    const word = getRandomWord(pool);

    if (!word) {
      return null;
    }

    return {
      level: config.id,
      levelLabel: config.label,
      mode: mode.id,
      modeLabel: mode.label,
      word: {
        id: word.id,
        text: word.word,
        syllables: [...word.syllables]
      },
      pieces: createSyllablePieces(word.syllables, state.lastPiecesOrder),
      expectedLength: word.syllables.length,
      correctAnswer: word.syllables.join('-')
    };
  }

  function start(payload = {}) {
    if (Number.isInteger(payload.level)) {
      state.level = payload.level;
    }

    if (payload.mode !== undefined) {
      state.mode = resolveOrderMode(payload.mode).id;
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
    state.lastPiecesOrder = state.round ? state.round.pieces.map((piece) => piece.text) : null;

    if (!state.round) {
      return { status: 'empty' };
    }

    state.metrics.roundsPlayed += 1;

    return {
      status: 'ready',
      level: state.round.level,
      levelLabel: state.round.levelLabel,
      mode: state.round.mode,
      modeLabel: state.round.modeLabel,
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
    if (payload.mode !== undefined) {
      state.mode = resolveOrderMode(payload.mode).id;
    }
    return start({ level: state.level, mode: state.mode });
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
