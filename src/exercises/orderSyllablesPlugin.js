import { getFilteredWords, normalizeSpanish, shuffleArray, wordMatchesLinguistic } from '../core/wordUtils.js';
import { createRecentHistory } from '../core/recentHistory.js';
import { resolveOrderLevel } from './orderSyllablesConfig.js';
import { migrateLegacyLevelConfig, normalizeSessionConfig } from '../core/sessionConfig.js';

export function ensureReorderedSyllables(syllables, random = Math.random) {
  if (!Array.isArray(syllables)) return [];
  if (syllables.length < 2) return [...syllables];
  if (new Set(syllables).size < 2) return null;
  const original = syllables.join('\u0000');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = shuffleArrayWith(syllables, random);
    if (candidate.join('\u0000') !== original) return candidate;
  }
  const reordered = [...syllables];
  const differentIndex = reordered.findIndex((value) => value !== reordered[0]);
  [reordered[0], reordered[differentIndex]] = [reordered[differentIndex], reordered[0]];
  return reordered;
}

export function isOrderableWord(word) {
  const syllables = Array.isArray(word) ? word : word?.syllables;
  return Array.isArray(syllables) && syllables.length >= 2 && new Set(syllables).size >= 2;
}

export function calculateRoundProgress(currentRound, totalRounds) {
  const current = Number(currentRound);
  const total = Number(totalRounds);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round(Math.min(Math.max(current, 0), total) / total * 100);
}

function shuffleArrayWith(values, random) {
  if (random === Math.random) return shuffleArray(values);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function isCorrectSyllableAnswer(answer, syllables) {
  return answer.length === syllables.length
    && answer.every((piece, index) => normalizeSpanish(piece.text ?? piece) === normalizeSpanish(syllables[index]));
}

export function createOrderSyllablesPlugin({ random = Math.random, getWords = getFilteredWords } = {}) {
  const history = createRecentHistory(Number.MAX_SAFE_INTEGER);
  const state = { level: 1, config: null, round: null, answer: [], score: 0, incorrectAttempts: 0,
    completed: false, checked: false, firstTry: true, results: [], plannedRounds: 0, therapistRestarts: 0, endedEarly: false };

  function snapshot(status = 'ready') {
    return { status, level: state.level, pieces: state.round?.pieces ?? [], answer: [...state.answer],
      expectedLength: state.round?.word.syllables.length ?? 0, wordId: state.round?.word.id,
      word: status === 'correct' ? state.round.word.text : undefined, score: state.score };
  }

  function makeRound() {
    const candidates = (state.config ? getWords({}).filter(word => wordMatchesLinguistic(word, state.config.linguistic)) : getWords(resolveOrderLevel(state.level).linguisticFilters)).filter(isOrderableWord);
    const fresh = candidates.filter((word) => !history.has(word.id));
    const word = getRandomWordWith(fresh.length ? fresh : candidates, random);
    if (!word) return null;
    const shuffled = ensureReorderedSyllables(word.syllables, random);
    if (!shuffled) return null;
    return { word: { id: word.id, text: word.word, syllables: [...word.syllables] },
      pieces: shuffled.map((text, index) => ({ id: `piece-${index}`, text })) };
  }

  function start(options = {}) {
    const legacy = !options.activityId && options.level != null;
    const config = normalizeSessionConfig(legacy ? migrateLegacyLevelConfig('order-syllables', options.level, options) : { activityId: 'order-syllables', ...options });
    state.config = legacy ? null : config; state.level = Number(options.level ?? state.level); state.plannedRounds = config.rounds;
    const resetScore = options.resetScore ?? true;
    if (resetScore) { state.score = 0; state.incorrectAttempts = 0; state.results = []; state.therapistRestarts = 0; state.endedEarly = false; history.clear(); }
    state.answer = []; state.completed = false; state.checked = false; state.firstTry = true;
    state.round = makeRound();
    return state.round ? snapshot() : { status: 'empty' };
  }

  function submit({ type, pieceId } = {}) {
    if (!state.round) return { status: 'empty' };
    if (type === 'tap') {
      if (state.completed || state.answer.some((piece) => piece.id === pieceId)) return snapshot('locked');
      const piece = state.round.pieces.find((item) => item.id === pieceId);
      if (!piece) return snapshot('idle');
      state.answer.push(piece); state.checked = false;
      return snapshot('progress');
    }
    if (type === 'undo') { if (!state.completed) state.answer.pop(); state.checked = false; return snapshot('progress'); }
    if (type === 'clear') { if (!state.completed) state.answer = []; state.checked = false; return snapshot('progress'); }
    if (type !== 'validate' || state.completed || state.checked
      || state.answer.length !== state.round.word.syllables.length) return snapshot('locked');
    if (!isCorrectSyllableAnswer(state.answer, state.round.word.syllables)) {
      state.incorrectAttempts += 1; state.firstTry = false; state.checked = true;
      return snapshot('incorrect');
    }
    state.completed = true; state.score += 1; history.add(state.round.word.id);
    state.results.push({ word: state.round.word.text, firstTry: state.firstTry });
    return snapshot('correct');
  }

  function next() { if (!state.completed) return snapshot('locked'); state.answer = []; state.completed = false; state.checked = false; state.firstTry = true; state.round = makeRound(); return state.round ? snapshot() : { status: 'empty' }; }
  function restartRound() { if (!state.round || state.completed) return snapshot('locked'); state.therapistRestarts += 1; state.answer = []; state.checked = false; state.firstTry = true; return snapshot(); }
  function skipRound() { if (!state.round || state.completed) return snapshot('locked'); state.results.push({ word: state.round.word.text, status: 'skipped', firstTry: false }); state.completed = true; return snapshot('skipped'); }
  function finishSession() { state.endedEarly = true; return getMetrics(); }
  function getMetrics() {
    const completed = state.results.filter(item => item.status !== 'skipped'); const skippedRounds = state.results.length - completed.length;
    const firstTryCorrect = completed.filter((item) => item.firstTry).length;
    return { score: state.score, roundsPlayed: completed.length, plannedRounds: state.plannedRounds, completedRounds: completed.length, correctRounds: completed.length, skippedRounds, therapistRestarts: state.therapistRestarts, endedEarly: state.endedEarly, firstTryCorrect,
      incorrectAttempts: state.incorrectAttempts,
      firstTryPercentage: completed.length ? Math.round(firstTryCorrect / completed.length * 100) : 0,
      results: state.results.map((item) => ({ ...item })), recentWordIds: history.snapshot() };
  }
  return { id: 'order-syllables', start, submit, next, getMetrics, restartRound, skipRound, finishSession, getSessionState: getMetrics };
}

function getRandomWordWith(words, random) {
  return words.length ? words[Math.floor(random() * words.length)] : null;
}
