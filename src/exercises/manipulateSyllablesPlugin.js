import { getAllWords, getFilteredWords, normalizeSpanish } from '../core/wordUtils.js';
import { MANIPULATION_OPERATIONS, SAFE_SYLLABLES, resolveManipulationLevel } from './manipulateSyllablesConfig.js';

const POSITION_NAMES = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta'];
const copy = (value) => structuredClone(value);
const sameText = (a, b) => normalizeSpanish(a) === normalizeSpanish(b);
const join = (parts) => parts.join('');

function positionName(index, length) {
  if (index === 0) return 'primera';
  if (index === length - 1) return 'última';
  return POSITION_NAMES[index] ?? `número ${index + 1}`;
}

function qualifiedSyllable(parts, index) {
  const repeated = parts.filter((part) => sameText(part, parts[index])).length > 1;
  return `${repeated ? `${positionName(index, parts.length)} ` : ''}sílaba ${parts[index].toLocaleUpperCase('es')}`;
}

function makePieces(parts, identity) {
  return parts.map((text, index) => ({ id: `${identity}-original-${index}`, text, originIndex: index, kind: 'original' }));
}

export function createChallenge({ word, operation, position = 0, syllable = null, variant = 'full' }) {
  const original = [...word.syllables];
  const identity = [word.id ?? word.word, operation, position, syllable ?? '', variant].join('|');
  const originalPieces = makePieces(original, identity);
  const extraPiece = ['add', 'replace'].includes(operation)
    ? { id: `${identity}-extra`, text: syllable, originIndex: null, kind: 'extra' } : null;
  let expectedPieces = []; let instruction = '';
  if (operation === 'remove') {
    expectedPieces = originalPieces.filter((_, index) => index !== position);
    instruction = `Quita la ${qualifiedSyllable(original, position)}.`;
  } else if (operation === 'add') {
    expectedPieces = [...originalPieces]; expectedPieces.splice(position, 0, extraPiece);
    instruction = position === 0 ? `Añade ${syllable.toLocaleUpperCase('es')} al principio.`
      : position === original.length ? `Añade ${syllable.toLocaleUpperCase('es')} al final.`
        : `Añade ${syllable.toLocaleUpperCase('es')} después de la ${positionName(position - 1, original.length)} sílaba.`;
  } else if (operation === 'replace') {
    expectedPieces = [...originalPieces]; expectedPieces[position] = extraPiece;
    instruction = `Cambia la ${qualifiedSyllable(original, position)} por ${syllable.toLocaleUpperCase('es')}.`;
  } else if (operation === 'invert') {
    expectedPieces = [...originalPieces];
    if (variant === 'edges' && original.length > 2) {
      [expectedPieces[0], expectedPieces[expectedPieces.length - 1]] = [expectedPieces.at(-1), expectedPieces[0]];
      instruction = 'Intercambia la primera y la última sílaba.';
    } else {
      expectedPieces.reverse(); instruction = 'Invierte el orden de las sílabas.';
    }
  }
  const expected = expectedPieces.map(({ text }) => text);
  return { id: identity, operation, baseWord: word.word, original, originalPieces, extraPiece, instruction,
    expected, expectedPieces, expectedText: join(expected), position, syllable, variant };
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
        const changedIdentity = challenge.expectedPieces.some((piece, index) => piece.id !== challenge.originalPieces[index]?.id);
        if (changedIdentity && !sameText(challenge.expectedText, word.word)) pool.push(challenge);
      }
    } else for (const position of positionsFor(operation, word.syllables.length, level)) {
      if (operation === 'remove') pool.push(createChallenge({ word, operation, position }));
      else for (const syllable of additions) {
        if (operation === 'replace' && sameText(word.syllables[position], syllable)) continue;
        pool.push(createChallenge({ word, operation, position, syllable }));
      }
    }
  }
  return pool.filter((challenge) => challenge.expected.length && !sameText(challenge.expectedText, challenge.baseWord));
}

function selectBalanced(pool, operations, total, random) {
  const groups = Object.fromEntries(operations.map((operation) => [operation, pool.filter((item) => item.operation === operation)]));
  const selected = [];
  for (let index = 0; index < total; index += 1) {
    const candidates = groups[operations[index % operations.length]];
    if (!candidates.length) break;
    selected.push(candidates.splice(Math.floor(random() * candidates.length), 1)[0]);
  }
  return selected;
}

const helperInstructions = {
  remove: 'Pulsa la sílaba que quieres quitar',
  add: 'Selecciona la ficha nueva y colócala en un espacio',
  replace: 'Selecciona la ficha nueva y después pulsa la sílaba que quieres cambiar',
  invert: 'Pulsa dos fichas para intercambiar sus posiciones'
};

export function createManipulateSyllablesPlugin({ random = Math.random, getWords = getFilteredWords, allWords = getAllWords } = {}) {
  const state = { challenges: [], index: 0, currentPieces: [], history: [], selectedPieceId: null, completed: false,
    firstTry: true, incorrectAttempts: 0, results: [], lastValidatedFingerprint: null, announcement: '', validationState: 'unvalidated' };
  const realWords = new Set(allWords().map((word) => normalizeSpanish(word.word)));
  const current = () => state.challenges[state.index];
  const fingerprint = () => state.currentPieces.map(({ id }) => id).join('|');
  const originalFingerprint = () => current().originalPieces.map(({ id }) => id).join('|');
  const extraIsPlaced = () => state.currentPieces.some(({ id }) => id === current().extraPiece?.id);
  function canValidate() {
    const round = current(); if (!round || state.completed || fingerprint() === state.lastValidatedFingerprint) return false;
    if (round.operation === 'remove') return state.currentPieces.length === round.originalPieces.length - 1;
    if (round.operation === 'add') return extraIsPlaced() && state.currentPieces.length === round.originalPieces.length + 1;
    if (round.operation === 'replace') return extraIsPlaced() && state.currentPieces.length === round.originalPieces.length;
    return fingerprint() !== originalFingerprint();
  }
  function snapshot(status = 'ready') {
    const round = current();
    return round ? { status, round: state.index + 1, total: state.challenges.length, operation: round.operation,
      baseWord: round.baseWord, original: [...round.original], originalPieces: copy(round.originalPieces), instruction: round.instruction,
      helperInstruction: helperInstructions[round.operation], currentPieces: copy(state.currentPieces), extraPiece: copy(round.extraPiece),
      extraAvailable: Boolean(round.extraPiece && !extraIsPlaced()), selectedPieceId: state.selectedPieceId, historyLength: state.history.length,
      canValidate: canValidate(), validationState: state.validationState, firstTry: state.firstTry,
      incorrectAttempts: state.incorrectAttempts, roundCompleted: state.completed, announcement: state.announcement,
      expectedLength: round.expectedPieces.length, expectedText: status === 'correct' ? round.expectedText : undefined,
      lexicalStatus: status === 'correct' ? (realWords.has(normalizeSpanish(round.expectedText)) ? 'real' : 'invented') : undefined } : { status: 'empty' };
  }
  function restoreRound() {
    state.currentPieces = copy(current().originalPieces); state.history = []; state.selectedPieceId = null;
    state.lastValidatedFingerprint = null; state.announcement = ''; state.validationState = 'unvalidated';
  }
  function recordMove() {
    state.history.push({ currentPieces: copy(state.currentPieces), selectedPieceId: state.selectedPieceId });
  }
  function changed(announcement) {
    state.lastValidatedFingerprint = null; state.validationState = 'unvalidated'; state.announcement = announcement;
    return snapshot('progress');
  }
  function start({ level = 1, operations = Object.keys(MANIPULATION_OPERATIONS), total = 5 } = {}) {
    const selectedOperations = [...new Set(operations)].filter((item) => MANIPULATION_OPERATIONS[item]);
    const pool = buildChallengePool({ level, operations: selectedOperations, getWords });
    if (!selectedOperations.length || pool.length < total) return { status: 'insufficient', available: pool.length, requested: total };
    const chosen = selectBalanced(pool, selectedOperations, total, random);
    if (chosen.length < total) return { status: 'insufficient', available: chosen.length, requested: total };
    Object.assign(state, { challenges: chosen, index: 0, completed: false, firstTry: true, incorrectAttempts: 0, results: [] });
    restoreRound(); return snapshot();
  }
  function submit({ type, pieceId, slotIndex } = {}) {
    const round = current(); if (!round) return { status: 'empty' };
    if (state.completed && type !== 'validate') return snapshot('locked');
    if (type === 'remove-piece') {
      if (round.operation !== 'remove' || state.currentPieces.length !== round.originalPieces.length) return snapshot('locked');
      const index = state.currentPieces.findIndex((piece) => piece.id === pieceId); if (index < 0) return snapshot('idle');
      recordMove(); const [removed] = state.currentPieces.splice(index, 1); state.selectedPieceId = null;
      return changed(`Sílaba ${removed.text.toLocaleUpperCase('es')} retirada`);
    }
    if (type === 'select-extra') {
      if (!['add', 'replace'].includes(round.operation) || !round.extraPiece || extraIsPlaced()) return snapshot('locked');
      if (pieceId !== round.extraPiece.id) return snapshot('idle');
      state.selectedPieceId = state.selectedPieceId === pieceId ? null : pieceId;
      state.announcement = state.selectedPieceId ? `Ficha ${round.extraPiece.text.toLocaleUpperCase('es')} seleccionada` : 'Selección cancelada';
      return snapshot('progress');
    }
    if (type === 'insert-at') {
      if (round.operation !== 'add' || state.selectedPieceId !== round.extraPiece?.id || extraIsPlaced()
        || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > state.currentPieces.length) return snapshot('locked');
      recordMove(); const previous = state.currentPieces[slotIndex - 1]; state.currentPieces.splice(slotIndex, 0, copy(round.extraPiece)); state.selectedPieceId = null;
      const where = slotIndex === 0 ? 'al principio' : slotIndex === round.originalPieces.length ? 'al final' : `después de ${previous.text.toLocaleUpperCase('es')}`;
      return changed(`${round.extraPiece.text.toLocaleUpperCase('es')} insertada ${where}`);
    }
    if (type === 'replace-piece') {
      if (round.operation !== 'replace' || state.selectedPieceId !== round.extraPiece?.id || extraIsPlaced()) return snapshot('locked');
      const index = state.currentPieces.findIndex((piece) => piece.id === pieceId); if (index < 0) return snapshot('idle');
      recordMove(); const replaced = state.currentPieces[index]; state.currentPieces[index] = copy(round.extraPiece); state.selectedPieceId = null;
      return changed(`${replaced.text.toLocaleUpperCase('es')} sustituida por ${round.extraPiece.text.toLocaleUpperCase('es')}`);
    }
    if (type === 'select-swap-piece') {
      if (round.operation !== 'invert' || !state.currentPieces.some((piece) => piece.id === pieceId)) return snapshot('locked');
      if (!state.selectedPieceId) { state.selectedPieceId = pieceId; state.announcement = `Sílaba ${state.currentPieces.find((p) => p.id === pieceId).text.toLocaleUpperCase('es')} seleccionada`; return snapshot('progress'); }
      if (state.selectedPieceId === pieceId) { state.selectedPieceId = null; state.announcement = 'Selección cancelada'; return snapshot('progress'); }
      const first = state.currentPieces.findIndex((piece) => piece.id === state.selectedPieceId); const second = state.currentPieces.findIndex((piece) => piece.id === pieceId);
      recordMove(); const firstText = state.currentPieces[first].text; const secondText = state.currentPieces[second].text;
      [state.currentPieces[first], state.currentPieces[second]] = [state.currentPieces[second], state.currentPieces[first]]; state.selectedPieceId = null;
      return changed(`${firstText.toLocaleUpperCase('es')} y ${secondText.toLocaleUpperCase('es')} intercambiadas`);
    }
    if (type === 'undo') {
      if (!state.history.length) return snapshot('locked');
      const previous = state.history.pop(); state.currentPieces = previous.currentPieces;
      state.selectedPieceId = ['add', 'replace'].includes(round.operation) ? null : previous.selectedPieceId;
      return changed('Último movimiento deshecho');
    }
    if (type === 'reset') { if (state.completed) return snapshot('locked'); restoreRound(); state.announcement = 'Palabra reiniciada'; return snapshot('progress'); }
    if (type !== 'validate' || !canValidate()) return snapshot('locked');
    state.lastValidatedFingerprint = fingerprint();
    const correct = state.currentPieces.length === round.expectedPieces.length && state.currentPieces.every((piece, index) =>
      piece.id === round.expectedPieces[index].id && sameText(piece.text, round.expectedPieces[index].text));
    if (!correct) { state.incorrectAttempts += 1; state.firstTry = false; state.validationState = 'incorrect'; state.announcement = ''; return snapshot('incorrect'); }
    state.completed = true; state.validationState = 'correct'; state.announcement = '';
    state.results.push({ operation: round.operation, baseWord: round.baseWord, instruction: round.instruction, expected: round.expectedText, firstTry: state.firstTry });
    return snapshot('correct');
  }
  function next() {
    if (!state.completed) return snapshot('locked');
    if (state.index >= state.challenges.length - 1) return { status: 'complete' };
    state.index += 1; state.completed = false; state.firstTry = true; restoreRound(); return snapshot();
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
