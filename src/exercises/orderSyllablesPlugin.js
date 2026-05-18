import { getFilteredWords, shuffleArray } from '../core/wordUtils.js';
import { resolveOrderLevel, resolveOrderMode, resolveSessionMode } from './orderSyllablesConfig.js';

function getLinguisticCandidates(levelConfig) {
  const base = getFilteredWords(levelConfig.linguisticFilters);
  if (levelConfig.id !== 3) return base;
  return base.filter((word) => word.structure !== 'CV-CV-CV');
}

function createSyllablePieces(syllables) {
  return shuffleArray(syllables).map((text, index) => ({ id: `${text}-${index}`, text }));
}

function classifyError({ expected, tapped }) {
  if (tapped && expected && tapped !== expected) return 'orden_incorrecto';
  return 'orden_incorrecto';
}

export function createOrderSyllablesPlugin() {
  const state = {
    level: 1,
    mode: 'normal',
    sessionMode: 'normal',
    round: null,
    answer: [],
    score: 0,
    sessionWords: [],
    sessionCursor: 0,
    sessionStats: { correctWords: 0, errors: 0 },
    metrics: { roundsPlayed: 0, roundsCorrect: 0, errorsByType: { inversion: 0, omision: 0, orden_incorrecto: 0 } }
  };

  function buildSessionWords(level) {
    const config = resolveOrderLevel(level);
    const targetCount = resolveSessionMode(state.sessionMode).wordCount;
    const pool = getLinguisticCandidates(config);
    const shuffled = shuffleArray(pool);
    return { config, words: shuffled.slice(0, Math.min(targetCount, shuffled.length)) };
  }

  function makeRoundWord(word, config) {
    const mode = resolveOrderMode(state.mode);
    return {
      level: config.id,
      levelLabel: config.label,
      mode: mode.id,
      modeLabel: mode.label,
      word: { id: word.id, text: word.word, syllables: [...word.syllables] },
      pieces: createSyllablePieces(word.syllables),
      expectedLength: word.syllables.length,
      correctAnswer: word.syllables.join('-')
    };
  }

  function start(payload = {}) {
    if (Number.isInteger(payload.level)) state.level = payload.level;
    if (payload.mode !== undefined) state.mode = resolveOrderMode(payload.mode).id;
    if (payload.sessionMode !== undefined) state.sessionMode = resolveSessionMode(payload.sessionMode).id;

    if (payload.resetScore) {
      state.score = 0;
      state.metrics.roundsPlayed = 0;
      state.metrics.roundsCorrect = 0;
      state.metrics.errorsByType = { inversion: 0, omision: 0, orden_incorrecto: 0 };
    }

    if (payload.startSession || state.sessionWords.length === 0) {
      const { config, words } = buildSessionWords(state.level);
      state.sessionWords = words;
      state.sessionCursor = 0;
      state.sessionStats = { correctWords: 0, errors: 0 };
      state.round = words[0] ? makeRoundWord(words[0], config) : null;
    }

    if (!state.round && state.sessionWords[state.sessionCursor]) {
      const config = resolveOrderLevel(state.level);
      state.round = makeRoundWord(state.sessionWords[state.sessionCursor], config);
    }

    state.answer = [];
    if (!state.round) return { status: 'empty' };
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
      answer: [],
      progress: {
        completedWords: state.sessionCursor,
        totalWords: state.sessionWords.length
      }
    };
  }

  function submit(payload = {}) {
    if (!state.round) return { status: 'empty' };
    if (payload.type !== 'tap') return { status: 'idle' };

    const tapped = payload.syllable;
    if (state.answer.length >= state.round.expectedLength) return { status: 'locked', answer: [...state.answer] };
    const expected = state.round.word.syllables[state.answer.length];

    if (tapped !== expected) {
      const errorType = classifyError({ tapped, expected });
      state.metrics.errorsByType[errorType] += 1;
      state.sessionStats.errors += 1;
      return { status: 'error', errorType, expected, answer: [...state.answer] };
    }

    state.answer.push(tapped);
    if (state.answer.length !== state.round.expectedLength) {
      return { status: 'progress', answer: [...state.answer], completed: false };
    }

    state.score += 1;
    state.metrics.roundsCorrect += 1;
    state.sessionStats.correctWords += 1;
    const wordId = state.round.word.id;

    state.sessionCursor += 1;
    const sessionCompleted = state.sessionCursor >= state.sessionWords.length;
    if (!sessionCompleted) {
      const config = resolveOrderLevel(state.level);
      state.round = makeRoundWord(state.sessionWords[state.sessionCursor], config);
      state.answer = [];
    }

    return {
      status: 'correct',
      score: state.score,
      answer: [...state.answer],
      wordId,
      roundCompleted: sessionCompleted,
      roundSummary: sessionCompleted
        ? {
            completedWords: state.sessionWords.length,
            correctWords: state.sessionStats.correctWords,
            errors: state.sessionStats.errors,
            score: state.score,
            usedWords: state.sessionWords.map((word) => word.id)
          }
        : null
    };
  }

  return {
    id: 'order-syllables',
    start,
    submit,
    next: start,
    getMetrics: () => ({
      score: state.score,
      roundsPlayed: state.metrics.roundsPlayed,
      roundsCorrect: state.metrics.roundsCorrect,
      errorsByType: { ...state.metrics.errorsByType },
      sessionWordIds: state.sessionWords.map((word) => word.id),
      completedInSession: state.sessionCursor
    })
  };
}
