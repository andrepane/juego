import { getFilteredWords, normalizeSpanish, shuffleArray, wordMatchesLinguistic } from '../core/wordUtils.js';
import { resolveOrderLevel } from './orderSyllablesConfig.js';
import { migrateLegacyLevelConfig, normalizeSessionConfig } from '../core/sessionConfig.js';
import { buildOrderChallengePool, ORDER_VARIANTS } from './orderSyllablesVariants.js';
import { planBalancedVariants } from '../core/challengePlanner.js';

export function ensureReorderedSyllables(syllables, random = Math.random) {
  if (!Array.isArray(syllables)) return []; if (syllables.length < 2) return [...syllables];
  if (new Set(syllables.map(normalizeSpanish)).size < 2) return null;
  for (let n = 0; n < 12; n += 1) { const result = random === Math.random ? shuffleArray(syllables) : shuffled(syllables, random); if (result.some((v, i) => normalizeSpanish(v) !== normalizeSpanish(syllables[i]))) return result; }
  const result = [...syllables]; const i = result.findIndex(v => normalizeSpanish(v) !== normalizeSpanish(result[0])); [result[0], result[i]] = [result[i], result[0]]; return result;
}
export const isOrderableWord = word => { const values = Array.isArray(word) ? word : word?.syllables; return Array.isArray(values) && values.length >= 2 && new Set(values.map(normalizeSpanish)).size >= 2; };
export const calculateRoundProgress = (current, total) => !Number.isFinite(Number(total)) || Number(total) <= 0 ? 0 : Math.round(Math.min(Math.max(Number(current), 0), Number(total)) / Number(total) * 100);
export const isCorrectSyllableAnswer = (answer, syllables) => answer.length === syllables.length && answer.every((piece, i) => normalizeSpanish(piece.text ?? piece) === normalizeSpanish(syllables[i]));

export function createOrderSyllablesPlugin({ random = Math.random, getWords = getFilteredWords, clock = () => Date.now(), setTimer = setTimeout } = {}) {
  const s = { challenges: [], index: 0, answer: [], completed: false, checked: false, firstTry: true, results: [], plannedRounds: 0, incorrectAttempts: 0, therapistRestarts: 0, endedEarly: false, movements: 0, undoUses: 0, resetUses: 0, startedAt: 0, memoryVisible: false, legacy: false };
  const round = () => s.challenges[s.index];
  const expected = () => round().targetPieces;
  const correct = () => s.answer.length === expected().length && s.answer.every((p, i) => p.id === expected()[i].id || (round().variant !== 'intruder' && normalizeSpanish(p.text) === normalizeSpanish(expected()[i].text)));
  function snapshot(status = 'ready') { const r = round(); if (!r) return { status: 'empty' }; return { status, round: s.index + 1, total: s.challenges.length, variant: r.variant, variantLabel: r.variantLabel, instruction: r.instruction, pieces: r.initialPieces, answer: [...s.answer], expectedLength: expected().length, wordId: r.word.id, word: status === 'correct' ? r.word.text : undefined, score: s.results.filter(x => x.status !== 'skipped').length, template: r.template, targetPosition: r.targetPosition, distractors: r.distractors, model: s.memoryVisible ? r.model : undefined, memoryVisible: s.memoryVisible, hint: ORDER_VARIANTS[r.variant].hint }; }
  function prepare() { const r = round(); s.answer = ['intruder', 'correctOrder'].includes(r.variant) ? structuredClone(r.initialPieces) : []; s.completed = false; s.checked = false; s.firstTry = true; s.startedAt = clock(); s.memoryVisible = r.variant === 'memory'; if (s.memoryVisible) setTimer(() => { s.memoryVisible = false; }, r.exposureMs); }
  function start(options = {}) {
    const legacy = !options.activityId && options.level != null; const config = normalizeSessionConfig(legacy ? migrateLegacyLevelConfig('order-syllables', options.level, options) : { activityId: 'order-syllables', ...options });
    const words = getWords(legacy ? resolveOrderLevel(options.level).linguisticFilters : {}).filter(word => (!legacy ? wordMatchesLinguistic(word, config.linguistic) : true) && isOrderableWord(word));
    const variants = legacy ? ['order'] : config.activityOptions.variants; let pool = buildOrderChallengePool(words, { ...config.activityOptions, variants }, random);
    if (!pool.length) return { status: 'empty' };
    pool = pool.map(challenge => ({ ...challenge, initialPieces: challenge.initialPieces.map((piece, index) => ({ ...piece, id: `piece-${index}` })) }));
    const plan = legacy ? { status: 'ready', challenges: pool } : planBalancedVariants(pool, variants, config.rounds, random);
    if (plan.status !== 'ready') return { status: 'insufficient', ...plan };
    Object.assign(s, { challenges: plan.challenges, index: 0, results: [], plannedRounds: config.rounds, incorrectAttempts: 0, therapistRestarts: 0, endedEarly: false, movements: 0, undoUses: 0, resetUses: 0, legacy }); prepare(); return snapshot();
  }
  function submit({ type, pieceId, fromIndex, toIndex } = {}) {
    if (!round()) return { status: 'empty' }; if (s.completed) return snapshot('locked');
    if (type === 'tap') { const p = round().initialPieces.find(x => x.id === pieceId); if (!p || s.answer.some(x => x.id === pieceId)) return snapshot('locked'); s.answer.push(p); s.checked = false; s.movements += 1; return snapshot('progress'); }
    if (type === 'remove-piece') { const i = s.answer.findIndex(x => x.id === pieceId); if (i < 0) return snapshot('idle'); s.answer.splice(i, 1); s.checked = false; s.movements += 1; return snapshot('progress'); }
    if (type === 'move' || type === 'drop') { if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || fromIndex >= s.answer.length || toIndex < 0 || toIndex >= s.answer.length) return snapshot('locked'); const [p] = s.answer.splice(fromIndex, 1); s.answer.splice(toIndex, 0, p); s.checked = false; s.movements += 1; return snapshot('progress'); }
    if (type === 'undo') { if (s.answer.length) s.answer.pop(); s.checked = false; s.undoUses += 1; return snapshot('progress'); }
    if (type === 'clear') { s.answer = ['intruder', 'correctOrder'].includes(round().variant) ? structuredClone(round().initialPieces) : []; s.checked = false; s.resetUses += 1; return snapshot('progress'); }
    if (type !== 'validate' || s.checked || s.answer.length !== expected().length) return snapshot('locked');
    if (!correct()) { s.incorrectAttempts += 1; s.firstTry = false; s.checked = true; return snapshot('incorrect'); }
    s.completed = true; s.results.push(resultRecord()); return snapshot('correct');
  }
  const resultRecord = (status) => ({ word: round().baseWord, baseWord: round().baseWord, variant: round().variant, operation: null, targetPosition: round().targetPosition, status, firstTry: status ? false : s.firstTry, incorrectAttempts: s.firstTry ? 0 : 1, helpUses: 0, movements: s.movements, durationMs: Math.max(0, clock() - s.startedAt) });
  function next() { if (!s.completed) return snapshot('locked'); if (++s.index >= s.challenges.length) return { status: 'complete' }; prepare(); return snapshot(); }
  function restartRound() { if (s.completed) return snapshot('locked'); s.therapistRestarts += 1; s.firstTry = false; prepare(); s.firstTry = false; return snapshot(); }
  function skipRound() { if (s.completed) return snapshot('locked'); s.results.push(resultRecord('skipped')); s.completed = true; return snapshot('skipped'); }
  function finishSession() { s.endedEarly = true; return getMetrics(); }
  function getMetrics() { const done = s.results.filter(x => x.status !== 'skipped'); const skippedRounds = s.results.length - done.length; const byVariant = Object.fromEntries(Object.keys(ORDER_VARIANTS).map(v => [v, aggregate(done.filter(x => x.variant === v))])); return { score: done.length, roundsPlayed: done.length, plannedRounds: s.plannedRounds, completedRounds: done.length, correctRounds: done.length, skippedRounds, uncompletedRounds: Math.max(0, s.plannedRounds - s.results.length), therapistRestarts: s.therapistRestarts, endedEarly: s.endedEarly, firstTryCorrect: done.filter(x => x.firstTry).length, incorrectAttempts: s.incorrectAttempts, firstTryPercentage: done.length ? Math.round(done.filter(x => x.firstTry).length / done.length * 100) : 0, totalMovements: s.movements, totalUndoUses: s.undoUses, totalResetUses: s.resetUses, byVariant, results: structuredClone(s.results), recentWordIds: s.results.map(x => x.baseWord) }; }
  return { id: 'order-syllables', start, submit, next, getMetrics, restartRound, skipRound, finishSession, getSessionState: getMetrics };
}
function aggregate(items) { return { rounds: items.length, firstTryCorrect: items.filter(x => x.firstTry).length, incorrectAttempts: items.reduce((n, x) => n + x.incorrectAttempts, 0) }; }
function shuffled(values, random) { const r = [...values]; for (let i = r.length - 1; i; i -= 1) { const j = Math.floor(random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
