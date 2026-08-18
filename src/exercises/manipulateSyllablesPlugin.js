import { getFilteredWords, normalizeSpanish } from '../core/wordUtils.js';
import { MANIPULATION_OPERATIONS, SAFE_SYLLABLES, resolveManipulationLevel } from './manipulateSyllablesConfig.js';
import { migrateLegacyLevelConfig, normalizeSessionConfig } from '../core/sessionConfig.js';

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

export function classifyTargetContext(operation, position, originalLength, variant = 'full') {
  if (operation === 'invert') return variant;
  if (position === 0) return 'initial';
  if (operation === 'add' ? position === originalLength : position === originalLength - 1) return 'final';
  return 'medial';
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

export function buildChallengePool({ level = 1, operations, config, getWords = getFilteredWords } = {}) {
  const normalized = config ? normalizeSessionConfig(config) : migrateLegacyLevelConfig('manipulate-syllables', level, { operations });
  const selectedOperations = operations ?? (config ? normalized.activityOptions.operations : Object.keys(MANIPULATION_OPERATIONS));
  const words = getWords(config ? {} : resolveManipulationLevel(level).filters).filter((word) => Array.isArray(word.syllables) && word.syllables.length >= 2);
  const additions = config ? (normalized.linguistic.complexities.includes('trabadas') ? [...SAFE_SYLLABLES.simple, ...SAFE_SYLLABLES.complex] : SAFE_SYLLABLES.simple) : level === 3 ? [...SAFE_SYLLABLES.simple, ...SAFE_SYLLABLES.complex] : SAFE_SYLLABLES.simple;
  const pool = [];
  for (const word of words) for (const operation of selectedOperations) {
    if (operation === 'invert') {
      const variants = config ? (word.syllables.length > 2 ? ['full', 'edges'] : ['full']) : level === 2 ? ['edges'] : level === 3 ? ['full', 'edges'] : ['full'];
      for (const variant of variants) {
        if (config && variant === 'edges' && !['initial', 'final'].every(position => normalized.linguistic.targetPositions.includes(position))) continue;
        const challenge = createChallenge({ word, operation, variant });
        const changedIdentity = challenge.expectedPieces.some((piece, index) => piece.id !== challenge.originalPieces[index]?.id);
        if (changedIdentity && !sameText(challenge.expectedText, word.word)) pool.push(challenge);
      }
    } else for (const position of positionsFor(operation, word.syllables.length, config ? 3 : level)) {
      if (config && !normalized.linguistic.targetPositions.includes(classifyTargetContext(operation, position, word.syllables.length))) continue;
      if (operation === 'remove') pool.push(createChallenge({ word, operation, position }));
      else for (const syllable of additions) {
        if (operation === 'replace' && sameText(word.syllables[position], syllable)) continue;
        pool.push(createChallenge({ word, operation, position, syllable }));
      }
    }
  }
  return pool.filter((challenge) => challenge.expected.length && !sameText(challenge.expectedText, challenge.baseWord));
}

function pick(items, random) { return items.length === 1 ? items[0] : items[Math.floor(random() * items.length)]; }

export function createBalancedOperationSchedule(operations, total, random = Math.random) {
  const unique = [...new Set(operations)];
  if (!unique.length || total <= 0) return [];
  const counts = Object.fromEntries(unique.map((operation) => [operation, Math.floor(total / unique.length)]));
  const remainderOrder = [...unique];
  for (let i = remainderOrder.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1)); [remainderOrder[i], remainderOrder[j]] = [remainderOrder[j], remainderOrder[i]];
  }
  for (let i = 0; i < total % unique.length; i += 1) counts[remainderOrder[i]] += 1;
  const schedule = [];
  while (schedule.length < total) {
    const available = unique.filter((operation) => counts[operation] > 0);
    const alternatives = available.filter((operation) => operation !== schedule.at(-1));
    const candidates = alternatives.length ? alternatives : available;
    const highest = Math.max(...candidates.map((operation) => counts[operation]));
    const operation = pick(candidates.filter((item) => counts[item] === highest), random);
    schedule.push(operation); counts[operation] -= 1;
  }
  return schedule;
}

export function planBalancedChallenges(pool, operations, total, random = Math.random) {
  const unique = [...new Set(operations)];
  const availableByOperation = Object.fromEntries(unique.map(operation => [operation, pool.filter(item => item.operation === operation).length]));
  const base = unique.length ? Math.floor(total / unique.length) : 0;
  const remainder = unique.length ? total % unique.length : 0;
  const eligibleForExtra = unique.filter(operation => availableByOperation[operation] >= base + 1);
  const missingBase = unique.filter(operation => availableByOperation[operation] < base);
  if (!unique.length || missingBase.length || eligibleForExtra.length < remainder) {
    const neededByOperation = Object.fromEntries(unique.map(operation => [operation, base + (eligibleForExtra.includes(operation) && eligibleForExtra.indexOf(operation) < remainder ? 1 : 0)]));
    return { status: 'insufficient', availableByOperation, neededByOperation, challenges: [] };
  }
  const extras = [...eligibleForExtra];
  for (let index = extras.length - 1; index > 0; index -= 1) { const target = Math.floor(random() * (index + 1)); [extras[index], extras[target]] = [extras[target], extras[index]]; }
  const extraSet = new Set(extras.slice(0, remainder));
  const neededByOperation = Object.fromEntries(unique.map(operation => [operation, base + (extraSet.has(operation) ? 1 : 0)]));
  const scheduleSeed = unique.flatMap(operation => Array(neededByOperation[operation]).fill(operation));
  const schedule = createBalancedOperationScheduleFromCounts(neededByOperation, random);
  const selection = selectVariedChallenges(pool, schedule, random);
  return { ...selection, schedule: scheduleSeed.length ? schedule : [], availableByOperation, neededByOperation };
}

function createBalancedOperationScheduleFromCounts(counts, random) {
  const remaining = { ...counts }; const operations = Object.keys(counts); const schedule = [];
  while (Object.values(remaining).some(Boolean)) {
    const available = operations.filter(operation => remaining[operation] > 0);
    const alternatives = available.filter(operation => operation !== schedule.at(-1));
    const candidates = alternatives.length ? alternatives : available;
    const highest = Math.max(...candidates.map(operation => remaining[operation]));
    const operation = pick(candidates.filter(item => remaining[item] === highest), random);
    schedule.push(operation); remaining[operation] -= 1;
  }
  return schedule;
}

export function selectVariedChallenges(pool, schedule, random = Math.random) {
  const selected = []; const identities = new Set(); const usage = new Map(); let previousWord = null;
  for (const operation of schedule) {
    let candidates = pool.filter((item) => item.operation === operation && !identities.has(item.id));
    if (!candidates.length) return { status: 'insufficient', challenges: selected };
    const minimum = Math.min(...candidates.map((item) => usage.get(item.baseWord) ?? 0));
    candidates = candidates.filter((item) => (usage.get(item.baseWord) ?? 0) === minimum);
    const nonImmediate = candidates.filter((item) => item.baseWord !== previousWord);
    if (nonImmediate.length) candidates = nonImmediate;
    const challenge = pick(candidates, random); selected.push(challenge); identities.add(challenge.id);
    usage.set(challenge.baseWord, (usage.get(challenge.baseWord) ?? 0) + 1); previousWord = challenge.baseWord;
  }
  return { status: 'ready', challenges: selected, wordUsage: Object.fromEntries(usage) };
}

const helperInstructions = {
  remove: 'Pulsa la sílaba que quieres quitar',
  add: 'Selecciona la ficha nueva y después el lugar donde quieres colocarla',
  replace: 'Selecciona la ficha nueva y después pulsa la sílaba que quieres cambiar',
  invert: 'Intercambia las fichas necesarias para obtener el nuevo orden'
};

export function createManipulateSyllablesPlugin({ random = Math.random, getWords = getFilteredWords } = {}) {
  const state = { challenges: [], index: 0, currentPieces: [], history: [], selectedPieceId: null, completed: false,
    firstTry: true, incorrectAttempts: 0, results: [], lastValidatedFingerprint: null, announcement: '', validationState: 'unvalidated',
    roundMetrics: { movements: 0, undoUses: 0, resetUses: 0 }, plannedRounds: 0, therapistRestarts: 0, endedEarly: false };
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
      extraAvailable: Boolean(round.extraPiece && !extraIsPlaced()), selectedPieceId: state.selectedPieceId, historyLength: state.history.length, isModified: fingerprint() !== originalFingerprint(),
      canValidate: canValidate(), validationState: state.validationState, firstTry: state.firstTry,
      incorrectAttempts: state.incorrectAttempts, roundCompleted: state.completed, announcement: state.announcement,
      roundMetrics: copy(state.roundMetrics), targetContext: classifyTargetContext(round.operation, round.position, round.original.length, round.variant),
      expectedLength: round.expectedPieces.length, expectedText: status === 'correct' ? round.expectedText : undefined,
    } : { status: 'empty' };
  }
  function restoreRound() {
    state.currentPieces = copy(current().originalPieces); state.history = []; state.selectedPieceId = null;
    state.lastValidatedFingerprint = null; state.announcement = ''; state.validationState = 'unvalidated';
  }
  function recordMove() {
    state.history.push({ currentPieces: copy(state.currentPieces), selectedPieceId: state.selectedPieceId });
    state.roundMetrics.movements += 1;
  }
  function changed(announcement) {
    state.lastValidatedFingerprint = null; state.validationState = 'unvalidated'; state.announcement = announcement;
    return snapshot('progress');
  }
  function start(options = {}) {
    const legacy = !options.activityId && options.level != null;
    const config = normalizeSessionConfig(options.activityId ? options : { activityId: 'manipulate-syllables', ...options });
    const operations = config.activityOptions.operations;
    const total = config.rounds;
    const selectedOperations = [...new Set(operations)].filter((item) => MANIPULATION_OPERATIONS[item]);
    const pool = legacy ? buildChallengePool({ level: options.level, operations: selectedOperations, getWords }) : buildChallengePool({ config, operations: selectedOperations, getWords });
    const selection = planBalancedChallenges(pool, selectedOperations, total, random);
    if (!selectedOperations.length || selection.status === 'insufficient') return { status: 'insufficient', available: pool.length, requested: total };
    Object.assign(state, { challenges: selection.challenges, index: 0, completed: false, firstTry: true, incorrectAttempts: 0, results: [], plannedRounds: total, therapistRestarts: 0, endedEarly: false });
    state.roundMetrics = { movements: 0, undoUses: 0, resetUses: 0 };
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
      state.roundMetrics.undoUses += 1;
      state.selectedPieceId = null;
      return changed('Último movimiento deshecho');
    }
    if (type === 'reset') { if (state.completed || fingerprint() === originalFingerprint()) return snapshot('locked'); state.roundMetrics.resetUses += 1; restoreRound(); state.announcement = 'Palabra reiniciada'; return snapshot('progress'); }
    if (type !== 'validate' || !canValidate()) return snapshot('locked');
    state.lastValidatedFingerprint = fingerprint();
    const correct = state.currentPieces.length === round.expectedPieces.length && state.currentPieces.every((piece, index) =>
      piece.id === round.expectedPieces[index].id && sameText(piece.text, round.expectedPieces[index].text));
    if (!correct) { state.incorrectAttempts += 1; state.firstTry = false; state.validationState = 'incorrect'; state.announcement = ''; return snapshot('incorrect'); }
    state.completed = true; state.validationState = 'correct'; state.announcement = '';
    state.results.push({ operation: round.operation, baseWord: round.baseWord, instruction: round.instruction, result: round.expectedText, expected: round.expectedText,
      firstTry: state.firstTry, incorrectAttempts: state.incorrectAttempts - state.results.reduce((sum, item) => sum + item.incorrectAttempts, 0),
      targetContext: snapshot().targetContext, ...copy(state.roundMetrics) });
    return snapshot('correct');
  }
  function next() {
    if (!state.completed) return snapshot('locked');
    if (state.index >= state.challenges.length - 1) return { status: 'complete' };
    state.index += 1; state.completed = false; state.firstTry = true; state.roundMetrics = { movements: 0, undoUses: 0, resetUses: 0 }; restoreRound(); return snapshot();
  }
  function restartRound() { if (!current() || state.completed) return snapshot('locked'); state.therapistRestarts += 1; restoreRound(); return snapshot('ready'); }
  function skipRound() {
    const round = current(); if (!round || state.completed) return snapshot('locked');
    state.results.push({ operation: round.operation, baseWord: round.baseWord, instruction: round.instruction, status: 'skipped', firstTry: false, incorrectAttempts: 0, targetContext: classifyTargetContext(round.operation, round.position, round.original.length, round.variant), ...copy(state.roundMetrics) });
    state.completed = true; return snapshot('skipped');
  }
  function finishSession() { state.endedEarly = true; return getSessionState(); }
  function getSessionState() { return getMetrics(); }
  function getMetrics() {
    const completed = state.results.filter(result => result.status !== 'skipped');
    const firstTryCorrect = completed.filter((result) => result.firstTry).length;
    const byOperation = Object.fromEntries(Object.keys(MANIPULATION_OPERATIONS).map((operation) => {
      const results = state.results.filter((result) => result.operation === operation);
      const first = results.filter((result) => result.firstTry).length;
      return [operation, { rounds: results.length, firstTryCorrect: first, incorrectAttempts: results.reduce((sum, item) => sum + item.incorrectAttempts, 0),
        firstTryPercentage: results.length ? Math.round(first / results.length * 100) : 0, movements: results.reduce((sum, item) => sum + item.movements, 0),
        undoUses: results.reduce((sum, item) => sum + item.undoUses, 0), resetUses: results.reduce((sum, item) => sum + item.resetUses, 0) }];
    }));
    const skippedRounds = state.results.length - completed.length;
    return { roundsPlayed: completed.length, plannedRounds: state.plannedRounds, completedRounds: completed.length, correctRounds: completed.length, skippedRounds, uncompletedRounds: Math.max(0, state.plannedRounds - completed.length - skippedRounds), therapistRestarts: state.therapistRestarts, endedEarly: state.endedEarly, firstTryCorrect, incorrectAttempts: state.incorrectAttempts,
      firstTryPercentage: completed.length ? Math.round(firstTryCorrect / completed.length * 100) : 0,
      totalMovements: state.results.reduce((sum, item) => sum + item.movements, 0), totalUndoUses: state.results.reduce((sum, item) => sum + item.undoUses, 0),
      totalResetUses: state.results.reduce((sum, item) => sum + item.resetUses, 0),
      byOperation, results: copy(state.results) };
  }
  return { id: 'manipulate-syllables', start, submit, next, getMetrics, restartRound, skipRound, finishSession, getSessionState };
}
