import { getAllWords, getFilteredWords, normalizeSpanish } from '../core/wordUtils.js';
import { MANIPULATION_OPERATIONS, SAFE_SYLLABLES, resolveManipulationLevel } from './manipulateSyllablesConfig.js';

const POSITION_NAMES = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta'];
const copy = (value) => structuredClone(value);
const same = (a, b) => normalizeSpanish(a) === normalizeSpanish(b);
const join = (parts) => parts.join('');

function positionName(index, length) {
  if (index === 0) return 'primera';
  if (index === length - 1) return 'última';
  return POSITION_NAMES[index] ?? `número ${index + 1}`;
}

function qualifiedSyllable(parts, index) {
  const repeated = parts.filter((part) => same(part, parts[index])).length > 1;
  return `${repeated ? `${positionName(index, parts.length)} ` : ''}sílaba ${parts[index].toLocaleUpperCase('es')}`;
}

function pieces(parts, identity) {
  return parts.map((text, index) => ({ id: `${identity}-piece-${index}`, text }));
}

export function createChallenge({ word, operation, position = 0, syllable = null, variant = 'full' }) {
  const original = [...word.syllables];
  let expected = []; let instruction = '';
  if (operation === 'remove') {
    expected = original.filter((_, index) => index !== position);
    instruction = `Quita la ${qualifiedSyllable(original, position)}.`;
  } else if (operation === 'add') {
    expected = [...original]; expected.splice(position, 0, syllable);
    instruction = position === 0 ? `Añade ${syllable.toLocaleUpperCase('es')} al principio.`
      : position === original.length ? `Añade ${syllable.toLocaleUpperCase('es')} al final.`
        : `Añade ${syllable.toLocaleUpperCase('es')} después de la ${positionName(position - 1, original.length)} sílaba.`;
  } else if (operation === 'replace') {
    expected = [...original]; expected[position] = syllable;
    instruction = `Cambia la ${qualifiedSyllable(original, position)} por ${syllable.toLocaleUpperCase('es')}.`;
  } else if (operation === 'invert') {
    expected = [...original];
    if (variant === 'edges' && original.length > 2) {
      [expected[0], expected[expected.length - 1]] = [expected[expected.length - 1], expected[0]];
      instruction = 'Intercambia la primera y la última sílaba.';
    } else {
      expected.reverse(); instruction = 'Invierte el orden de las sílabas.';
    }
  }
  const identity = [word.id ?? word.word, operation, position, syllable ?? '', variant].join('|');
  const available = operation === 'remove' ? original.filter((_, index) => index !== position)
    : operation === 'replace' ? original.map((part, index) => index === position ? syllable : part)
      : operation === 'add' ? [...original, syllable] : [...original];
  return { id: identity, operation, baseWord: word.word, original, instruction, expected, expectedText: join(expected), pieces: pieces(available, identity), position, syllable, variant };
}

function positionsFor(operation, length, level) {
  if (operation === 'add') return level === 1 ? [0, length] : Array.from({ length: length + 1 }, (_, i) => i);
  return level === 1 ? [0, length - 1] : Array.from({ length }, (_, i) => i);
}

export function buildChallengePool({ level = 1, operations = Object.keys(MANIPULATION_OPERATIONS), getWords = getFilteredWords } = {}) {
  const words = getWords(resolveManipulationLevel(level).filters).filter((word) => Array.isArray(word.syllables) && word.syllables.length >= 2);
  const additions = level === 3 ? [...SAFE_SYLLABLES.simple, ...SAFE_SYLLABLES.complex] : SAFE_SYLLABLES.simple;
  const pool = [];
  for (const word of words) for (const operation of operations) {
    if (operation === 'invert') {
      const variants = level === 2 ? ['edges'] : level === 3 ? ['full', 'edges'] : ['full'];
      for (const variant of variants) {
        const challenge = createChallenge({ word, operation, variant });
        if (normalizeSpanish(challenge.expectedText) !== normalizeSpanish(word.word)) pool.push(challenge);
      }
    } else for (const position of positionsFor(operation, word.syllables.length, level)) {
      if (operation === 'remove') pool.push(createChallenge({ word, operation, position }));
      else for (const syllable of additions) {
        if (operation === 'replace' && same(word.syllables[position], syllable)) continue;
        pool.push(createChallenge({ word, operation, position, syllable }));
      }
    }
  }
  return pool.filter((challenge) => challenge.expected.length && normalizeSpanish(challenge.expectedText) !== normalizeSpanish(challenge.baseWord));
}

function selectBalanced(pool, operations, total, random) {
  const groups = Object.fromEntries(operations.map((operation) => [operation, pool.filter((item) => item.operation === operation)]));
  const selected = [];
  for (let index = 0; index < total; index += 1) {
    const operation = operations[index % operations.length];
    const candidates = groups[operation];
    if (!candidates.length) break;
    selected.push(candidates.splice(Math.floor(random() * candidates.length), 1)[0]);
  }
  return selected;
}

export function createManipulateSyllablesPlugin({ random = Math.random, getWords = getFilteredWords, allWords = getAllWords } = {}) {
  const state = { challenges: [], index: 0, answer: [], completed: false, checked: false, firstTry: true, incorrectAttempts: 0, results: [] };
  const realWords = new Set(allWords().map((word) => normalizeSpanish(word.word)));
  const current = () => state.challenges[state.index];
  function snapshot(status = 'ready') {
    const round = current();
    return round ? { status, round: state.index + 1, total: state.challenges.length, operation: round.operation,
      baseWord: round.baseWord, original: [...round.original], instruction: round.instruction, pieces: copy(round.pieces),
      answer: copy(state.answer), expectedLength: round.expected.length,
      expectedText: status === 'correct' ? round.expectedText : undefined,
      lexicalStatus: status === 'correct' ? (realWords.has(normalizeSpanish(round.expectedText)) ? 'real' : 'invented') : undefined } : { status: 'empty' };
  }
  function start({ level = 1, operations = Object.keys(MANIPULATION_OPERATIONS), total = 5 } = {}) {
    const selectedOperations = [...new Set(operations)].filter((item) => MANIPULATION_OPERATIONS[item]);
    const pool = buildChallengePool({ level, operations: selectedOperations, getWords });
    if (!selectedOperations.length || pool.length < total) return { status: 'insufficient', available: pool.length, requested: total };
    const chosen = selectBalanced(pool, selectedOperations, total, random);
    if (chosen.length < total) return { status: 'insufficient', available: chosen.length, requested: total };
    Object.assign(state, { challenges: chosen, index: 0, answer: [], completed: false, checked: false, firstTry: true, incorrectAttempts: 0, results: [] });
    return snapshot();
  }
  function submit({ type, pieceId } = {}) {
    const round = current(); if (!round) return { status: 'empty' };
    if (type === 'tap') {
      if (state.completed || state.answer.some((item) => item.id === pieceId)) return snapshot('locked');
      const piece = round.pieces.find((item) => item.id === pieceId); if (!piece) return snapshot('idle');
      state.answer.push(piece); state.checked = false; return snapshot('progress');
    }
    if (type === 'undo' || type === 'clear') {
      if (!state.completed) state.answer = type === 'undo' ? state.answer.slice(0, -1) : [];
      state.checked = false; return snapshot('progress');
    }
    if (type !== 'validate' || state.completed || state.checked || state.answer.length !== round.expected.length) return snapshot('locked');
    const correct = state.answer.every((item, index) => same(item.text, round.expected[index]));
    if (!correct) { state.incorrectAttempts += 1; state.firstTry = false; state.checked = true; return snapshot('incorrect'); }
    state.completed = true; state.checked = true;
    state.results.push({ operation: round.operation, baseWord: round.baseWord, instruction: round.instruction, expected: round.expectedText, firstTry: state.firstTry });
    return snapshot('correct');
  }
  function next() {
    if (!state.completed) return snapshot('locked');
    if (state.index >= state.challenges.length - 1) return { status: 'complete' };
    state.index += 1; state.answer = []; state.completed = false; state.checked = false; state.firstTry = true; return snapshot();
  }
  function getMetrics() {
    const firstTryCorrect = state.results.filter((result) => result.firstTry).length;
    const byOperation = Object.fromEntries(Object.keys(MANIPULATION_OPERATIONS).map((operation) => {
      const results = state.results.filter((result) => result.operation === operation);
      return [operation, { rounds: results.length, firstTryCorrect: results.filter((result) => result.firstTry).length }];
    }));
    return { roundsPlayed: state.results.length, firstTryCorrect, incorrectAttempts: state.incorrectAttempts,
      firstTryPercentage: state.results.length ? Math.round(firstTryCorrect / state.results.length * 100) : 0,
      byOperation, results: copy(state.results) };
  }
  return { id: 'manipulate-syllables', start, submit, next, getMetrics };
}
