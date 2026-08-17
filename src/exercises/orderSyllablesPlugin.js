import { getFilteredWords, normalizeSpanish, shuffleArray } from '../core/wordUtils.js';
import { createRecentHistory } from '../core/recentHistory.js';
import { resolveOrderLevel } from './orderSyllablesConfig.js';

export function ensureReorderedSyllables(syllables, random = Math.random) {
  if (!Array.isArray(syllables) || syllables.length < 2) return [...(syllables ?? [])];
  const original = syllables.join('\u0000');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = shuffleArrayWith(syllables, random);
    if (candidate.join('\u0000') !== original) return candidate;
  }
  return [...syllables.slice(1), syllables[0]];
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

export function createOrderSyllablesPlugin({ random = Math.random } = {}) {
  const history = createRecentHistory(Number.MAX_SAFE_INTEGER);
  const state = { level: 1, round: null, answer: [], score: 0, incorrectAttempts: 0,
    completed: false, checked: false, firstTry: true, results: [] };

  function snapshot(status = 'ready') {
    return { status, level: state.level, pieces: state.round?.pieces ?? [], answer: [...state.answer],
      expectedLength: state.round?.word.syllables.length ?? 0, wordId: state.round?.word.id,
      word: status === 'correct' ? state.round.word.text : undefined, score: state.score };
  }

  function makeRound() {
    const candidates = getFilteredWords(resolveOrderLevel(state.level).linguisticFilters);
    const fresh = candidates.filter((word) => !history.has(word.id));
    const word = getRandomWordWith(fresh.length ? fresh : candidates, random);
    if (!word) return null;
    const shuffled = ensureReorderedSyllables(word.syllables, random);
    return { word: { id: word.id, text: word.word, syllables: [...word.syllables] },
      pieces: shuffled.map((text, index) => ({ id: `piece-${index}`, text })) };
  }

  function start({ level = state.level, resetScore = false } = {}) {
    state.level = Number(level);
    if (resetScore) { state.score = 0; state.incorrectAttempts = 0; state.results = []; history.clear(); }
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
    if (type !== 'validate' || state.completed || state.answer.length !== state.round.word.syllables.length) return snapshot('locked');
    if (!isCorrectSyllableAnswer(state.answer, state.round.word.syllables)) {
      state.incorrectAttempts += 1; state.firstTry = false; state.checked = true;
      return snapshot('incorrect');
    }
    state.completed = true; state.score += 1; history.add(state.round.word.id);
    state.results.push({ word: state.round.word.text, firstTry: state.firstTry });
    return snapshot('correct');
  }

  function next() { return state.completed ? start({ level: state.level }) : snapshot('locked'); }
  function getMetrics() {
    const firstTryCorrect = state.results.filter((item) => item.firstTry).length;
    return { score: state.score, roundsPlayed: state.results.length, firstTryCorrect,
      incorrectAttempts: state.incorrectAttempts,
      firstTryPercentage: state.results.length ? Math.round(firstTryCorrect / state.results.length * 100) : 0,
      results: state.results.map((item) => ({ ...item })), recentWordIds: history.snapshot() };
  }
  return { id: 'order-syllables', start, submit, next, getMetrics };
}

function getRandomWordWith(words, random) {
  return words.length ? words[Math.floor(random() * words.length)] : null;
}
