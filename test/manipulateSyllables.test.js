import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChallengePool, createBalancedOperationSchedule, createChallenge, createManipulateSyllablesPlugin, selectVariedChallenges } from '../src/exercises/manipulateSyllablesPlugin.js';

const casa = { id: 'casa', word: 'casa', syllables: ['ca', 'sa'], syllableCount: 2, structure: 'CV-CV' };
const queso = { id: 'queso', word: 'queso', syllables: ['que', 'so'], syllableCount: 2, structure: 'CV-CV' };
const tomate = { id: 'tomate', word: 'tomate', syllables: ['to', 'ma', 'te'], syllableCount: 3, structure: 'CV-CV-CV' };
const patata = { id: 'patata', word: 'patata', syllables: ['pa', 'ta', 'ta'], syllableCount: 3, structure: 'CV-CV-CV' };
const nino = { id: 'nino', word: 'niño', syllables: ['ni', 'ño'], syllableCount: 2, structure: 'CV-CV' };
const cafe = { id: 'cafe', word: 'café', syllables: ['ca', 'fé'], syllableCount: 2, structure: 'CV-CV' };
const words = [casa, queso, tomate, patata, nino, cafe];
const source = () => words;

function startOne(word, operation, predicate = () => true, level = word.syllables.length === 3 ? 2 : 1) {
  const pool = buildChallengePool({ level, operations: [operation], getWords: () => [word] });
  const index = pool.findIndex(predicate); assert.notEqual(index, -1);
  const game = createManipulateSyllablesPlugin({ getWords: () => [word], allWords: source, random: () => (index + 0.01) / pool.length });
  const round = game.start({ level, operations: [operation], total: 1 });
  const challenge = pool.find((item) => item.baseWord === round.baseWord && item.operation === round.operation && item.instruction === round.instruction);
  return { game, round, challenge };
}
function solve(game, round, challenge) {
  if (round.operation === 'remove') {
    const target = challenge.originalPieces.find((piece) => !challenge.expectedPieces.some((expected) => expected.id === piece.id));
    return game.submit({ type: 'remove-piece', pieceId: target.id });
  }
  if (round.operation === 'add') {
    game.submit({ type: 'select-extra', pieceId: round.extraPiece.id });
    return game.submit({ type: 'insert-at', slotIndex: challenge.position });
  }
  if (round.operation === 'replace') {
    game.submit({ type: 'select-extra', pieceId: round.extraPiece.id });
    return game.submit({ type: 'replace-piece', pieceId: round.originalPieces[challenge.position].id });
  }
  let state = round;
  for (let index = 0; index < challenge.expectedPieces.length; index += 1) {
    if (state.currentPieces[index].id === challenge.expectedPieces[index].id) continue;
    const other = state.currentPieces.find((piece) => piece.id === challenge.expectedPieces[index].id);
    game.submit({ type: 'select-swap-piece', pieceId: state.currentPieces[index].id });
    state = game.submit({ type: 'select-swap-piece', pieceId: other.id });
  }
  return state;
}

test('los retos conservan soluciones, fichas originales y fichas extra con identidad', () => {
  const remove = createChallenge({ word: tomate, operation: 'remove', position: 1 });
  const add = createChallenge({ word: casa, operation: 'add', position: 1, syllable: 'mi' });
  const replace = createChallenge({ word: tomate, operation: 'replace', position: 1, syllable: 'lu' });
  assert.equal(remove.expectedText, 'tote'); assert.deepEqual(remove.originalPieces.map(p => p.text), ['to', 'ma', 'te']);
  assert.equal(add.expectedText, 'camisa'); assert.equal(add.extraPiece.text, 'mi');
  assert.equal(replace.expectedText, 'tolute'); assert.equal(replace.originalPieces[1].text, 'ma');
  assert.equal(new Set(createChallenge({ word: patata, operation: 'invert' }).originalPieces.map(p => p.id)).size, 3);
});

test('quitar empieza completa, retira solo una ficha y deshacer la repone en su posición', () => {
  const { game, round, challenge } = startOne(queso, 'remove', c => c.position === 1);
  assert.deepEqual(round.currentPieces.map(p => p.text), ['que', 'so']);
  let state = game.submit({ type: 'remove-piece', pieceId: round.originalPieces[1].id });
  assert.deepEqual(state.currentPieces.map(p => p.text), ['que']); assert.equal(state.canValidate, true); assert.match(state.announcement, /SO retirada/);
  assert.equal(game.submit({ type: 'remove-piece', pieceId: round.originalPieces[0].id }).status, 'locked');
  state = game.submit({ type: 'undo' }); assert.deepEqual(state.currentPieces.map(p => p.text), ['que', 'so']);
  solve(game, state, challenge); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
});

test('quitar incorrectamente registra error, no revela solución y reiniciar restaura', () => {
  const { game, round } = startOne(queso, 'remove', c => c.position === 1);
  game.submit({ type: 'remove-piece', pieceId: round.originalPieces[0].id });
  const wrong = game.submit({ type: 'validate' }); assert.equal(wrong.status, 'incorrect'); assert.equal(wrong.expectedText, undefined);
  assert.equal(game.submit({ type: 'validate' }).status, 'locked'); assert.equal(game.getMetrics().incorrectAttempts, 1);
  const reset = game.submit({ type: 'reset' }); assert.deepEqual(reset.currentPieces.map(p => p.text), ['que', 'so']); assert.equal(reset.canValidate, false);
});

test('quitar distingue la posición concreta de sílabas repetidas', () => {
  const { game, round } = startOne(patata, 'remove', c => c.position === 2);
  assert.match(round.instruction, /última sílaba TA/);
  game.submit({ type: 'remove-piece', pieceId: round.originalPieces[1].id }); assert.equal(game.submit({ type: 'validate' }).status, 'incorrect');
  game.submit({ type: 'undo' }); game.submit({ type: 'remove-piece', pieceId: round.originalPieces[2].id }); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
});

test('añadir requiere seleccionar la ficha y admite principio, medio y final', () => {
  for (const position of [0, 1, 2]) {
    const { game, round } = startOne(casa, 'add', c => c.position === position && c.syllable === 'mi', 2);
    assert.deepEqual(round.currentPieces.map(p => p.text), ['ca', 'sa']); assert.equal(round.extraPiece.text, 'mi');
    assert.equal(game.submit({ type: 'insert-at', slotIndex: position }).status, 'locked');
    let state = game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); assert.equal(state.selectedPieceId, round.extraPiece.id);
    state = game.submit({ type: 'insert-at', slotIndex: position }); assert.equal(state.currentPieces[position].id, round.extraPiece.id); assert.equal(state.canValidate, true);
    assert.equal(game.submit({ type: 'insert-at', slotIndex: 0 }).status, 'locked'); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
  }
});

test('deshacer una adición devuelve la ficha a su zona y reiniciar conserva el original', () => {
  const { game, round } = startOne(casa, 'add', c => c.position === 1 && c.syllable === 'mi', 2);
  game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); game.submit({ type: 'insert-at', slotIndex: 1 });
  let state = game.submit({ type: 'undo' }); assert.equal(state.extraAvailable, true); assert.deepEqual(state.currentPieces.map(p => p.text), ['ca', 'sa']);
  state = game.submit({ type: 'reset' }); assert.equal(state.selectedPieceId, null); assert.deepEqual(state.currentPieces.map(p => p.text), ['ca', 'sa']);
});

test('añadir valida la posición exacta', () => {
  const { game, round } = startOne(casa, 'add', c => c.position === 1 && c.syllable === 'mi', 2);
  game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); game.submit({ type: 'insert-at', slotIndex: 0 }); assert.equal(game.submit({ type: 'validate' }).status, 'incorrect');
  game.submit({ type: 'undo' }); game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); game.submit({ type: 'insert-at', slotIndex: 1 }); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
});

test('sustituir muestra la original, seleccionar no altera y reemplaza solo una vez', () => {
  const { game, round } = startOne(tomate, 'replace', c => c.position === 1 && c.syllable === 'lu');
  assert.deepEqual(round.currentPieces.map(p => p.text), ['to', 'ma', 'te']); assert.equal(round.extraPiece.text, 'lu');
  let state = game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); assert.deepEqual(state.currentPieces.map(p => p.text), ['to', 'ma', 'te']);
  state = game.submit({ type: 'replace-piece', pieceId: round.originalPieces[1].id }); assert.deepEqual(state.currentPieces.map(p => p.text), ['to', 'lu', 'te']);
  assert.equal(game.submit({ type: 'replace-piece', pieceId: round.originalPieces[0].id }).status, 'locked');
  state = game.submit({ type: 'undo' }); assert.deepEqual(state.currentPieces.map(p => p.text), ['to', 'ma', 'te']); assert.equal(state.extraAvailable, true);
});

test('sustituir valida identidad y posición incluso con sílabas repetidas', () => {
  const { game, round } = startOne(patata, 'replace', c => c.position === 2 && c.syllable === 'lu');
  game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); game.submit({ type: 'replace-piece', pieceId: round.originalPieces[1].id }); assert.equal(game.submit({ type: 'validate' }).status, 'incorrect');
  game.submit({ type: 'undo' }); game.submit({ type: 'select-extra', pieceId: round.extraPiece.id }); game.submit({ type: 'replace-piece', pieceId: round.originalPieces[2].id }); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
});

test('invertir selecciona, cancela e intercambia sin comenzar en una zona vacía', () => {
  const { game, round } = startOne(casa, 'invert'); assert.deepEqual(round.currentPieces.map(p => p.text), ['ca', 'sa']); assert.equal(round.canValidate, false);
  let state = game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[0].id }); assert.deepEqual(state.currentPieces.map(p => p.text), ['ca', 'sa']); assert.equal(state.selectedPieceId, round.originalPieces[0].id);
  state = game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[0].id }); assert.equal(state.selectedPieceId, null);
  game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[0].id }); state = game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[1].id }); assert.deepEqual(state.currentPieces.map(p => p.text), ['sa', 'ca']); assert.equal(state.canValidate, true);
  assert.equal(game.submit({ type: 'validate' }).status, 'correct');
});

test('invertir permite varios intercambios, deshacer y reiniciar', () => {
  const { game, round, challenge } = startOne(tomate, 'invert', c => c.variant === 'full', 3);
  game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[0].id }); let state = game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[2].id });
  state = game.submit({ type: 'undo' }); assert.deepEqual(state.currentPieces.map(p => p.text), ['to', 'ma', 'te']);
  solve(game, state, challenge); state = game.submit({ type: 'reset' }); assert.deepEqual(state.currentPieces.map(p => p.text), ['to', 'ma', 'te']); assert.equal(state.canValidate, false);
  solve(game, state, challenge); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
});

test('invertir completa intercambio de extremos y excluye resultados visualmente idénticos', () => {
  const { game, round, challenge } = startOne(tomate, 'invert', c => c.variant === 'edges'); solve(game, round, challenge); assert.equal(game.submit({ type: 'validate' }).status, 'correct');
  const pool = buildChallengePool({ level: 2, operations: ['invert'], getWords: () => [{ id: 'tatata', word: 'tatata', syllables: ['ta', 'ta', 'ta'] }] }); assert.equal(pool.length, 0);
});

test('acciones incompatibles y movimientos posteriores al acierto quedan bloqueados', () => {
  const { game, round, challenge } = startOne(casa, 'invert');
  assert.equal(game.submit({ type: 'remove-piece', pieceId: round.originalPieces[0].id }).status, 'locked'); solve(game, round, challenge); game.submit({ type: 'validate' });
  assert.equal(game.submit({ type: 'reset' }).status, 'locked'); assert.equal(game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[0].id }).status, 'locked');
});

test('un estado incorrecto se cuenta una vez y una modificación permite revalidar', () => {
  const { game, round } = startOne(casa, 'invert');
  game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[0].id }); game.submit({ type: 'select-swap-piece', pieceId: round.originalPieces[1].id }); game.submit({ type: 'undo' });
  assert.equal(game.submit({ type: 'validate' }).status, 'locked');
  // En quitar sí existe un estado completo incorrecto y modificable mediante deshacer.
  const remove = startOne(queso, 'remove', c => c.position === 1); remove.game.submit({ type: 'remove-piece', pieceId: remove.round.originalPieces[0].id }); remove.game.submit({ type: 'validate' });
  assert.equal(remove.game.submit({ type: 'validate' }).status, 'locked'); remove.game.submit({ type: 'undo' }); remove.game.submit({ type: 'remove-piece', pieceId: remove.round.originalPieces[1].id }); assert.equal(remove.game.submit({ type: 'validate' }).status, 'correct'); assert.equal(remove.game.getMetrics().incorrectAttempts, 1);
});

test('una doble validación correcta puntúa una sola vez y conserva métricas', () => {
  const { game, round, challenge } = startOne(casa, 'invert'); solve(game, round, challenge); assert.equal(game.submit({ type: 'validate' }).status, 'correct'); assert.equal(game.submit({ type: 'validate' }).status, 'locked');
  assert.deepEqual([game.getMetrics().roundsPlayed, game.getMetrics().firstTryCorrect, game.getMetrics().firstTryPercentage], [1, 1, 100]);
});

test('no revela solución antes del acierto y conserva tildes y ñ', () => {
  const cafeRound = startOne(cafe, 'invert'); assert.equal(cafeRound.round.expectedText, undefined); solve(cafeRound.game, cafeRound.round, cafeRound.challenge); assert.equal(cafeRound.game.submit({ type: 'validate' }).expectedText, 'féca');
  assert.equal(createChallenge({ word: nino, operation: 'invert' }).expectedText, 'ñoni');
});

test('sesiones deterministas completan 5, 10 y 20 rondas', () => {
  for (const total of [5, 10, 20]) {
    const game = createManipulateSyllablesPlugin({ random: () => 0 }); let round = game.start({ level: 1, operations: ['remove', 'add', 'replace', 'invert'], total });
    assert.equal(round.total, total);
    for (let index = 0; index < total; index += 1) {
      const challenge = buildChallengePool({ level: 1 }).find(c => c.baseWord === round.baseWord && c.operation === round.operation && c.instruction === round.instruction);
      assert.ok(challenge); solve(game, round, challenge); assert.equal(game.submit({ type: 'validate' }).status, 'correct'); if (index < total - 1) round = game.next();
    }
    assert.equal(game.getMetrics().roundsPlayed, total);
  }
});

test('distribuye operaciones y mantiene métricas agrupadas', () => {
  const game = createManipulateSyllablesPlugin({ random: () => 0 }); let round = game.start({ level: 1, operations: ['remove', 'add'], total: 10 });
  for (let i = 0; i < 10; i += 1) { const challenge = buildChallengePool({ level: 1, operations: ['remove', 'add'] }).find(c => c.baseWord === round.baseWord && c.operation === round.operation && c.instruction === round.instruction); solve(game, round, challenge); game.submit({ type: 'validate' }); if (i < 9) round = game.next(); }
  const metrics = game.getMetrics(); assert.deepEqual([metrics.byOperation.remove.rounds, metrics.byOperation.add.rounds], [5, 5]);
});

test('devuelve insufficient con cantidad disponible', () => {
  const game = createManipulateSyllablesPlugin({ getWords: () => [], allWords: source }); assert.deepEqual(game.start({ level: 1, operations: ['remove'], total: 10 }), { status: 'insufficient', available: 0, requested: 10 });
});

test('planifica operaciones equilibradas, aleatorias y sin consecutivas evitables', () => {
  const operations = ['remove', 'add', 'replace', 'invert'];
  for (const total of [5, 8, 10, 15, 20]) {
    const schedule = createBalancedOperationSchedule(operations, total, () => 0.37);
    const counts = operations.map((operation) => schedule.filter((item) => item === operation).length);
    assert.equal(schedule.length, total); assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    assert.ok(schedule.every((item, index) => index === 0 || item !== schedule[index - 1]));
  }
  assert.notDeepEqual(createBalancedOperationSchedule(operations, 8, () => 0), createBalancedOperationSchedule(operations, 8, () => 0.9));
});

test('planifica una operación y un subconjunto sin repetir si sobran operaciones', () => {
  assert.deepEqual(createBalancedOperationSchedule(['remove'], 5, () => 0), Array(5).fill('remove'));
  const subset = createBalancedOperationSchedule(['remove', 'add', 'replace', 'invert'], 2, () => 0.6);
  assert.equal(new Set(subset).size, 2);
  const two = createBalancedOperationSchedule(['remove', 'add'], 7, () => 0.2);
  assert.deepEqual([...new Set(two)].sort(), ['add', 'remove']);
});

test('prioriza palabras distintas, repite tras agotarlas y no repite retos', () => {
  const pool = buildChallengePool({ level: 1, operations: ['remove'], getWords: () => [casa, queso] });
  const selection = selectVariedChallenges(pool, Array(4).fill('remove'), () => 0);
  assert.equal(selection.status, 'ready');
  assert.notEqual(selection.challenges[0].baseWord, selection.challenges[1].baseWord);
  assert.ok(selection.challenges.every((item, index) => index === 0 || item.baseWord !== selection.challenges[index - 1].baseWord));
  assert.equal(new Set(selection.challenges.map((item) => item.id)).size, 4);
  assert.equal(selectVariedChallenges(pool.slice(0, 1), ['remove', 'remove'], () => 0).status, 'insufficient');
});

test('movimientos, deshacer, reiniciar y contexto se registran por ronda y operación', () => {
  const { game, round, challenge } = startOne(queso, 'remove', c => c.position === 1);
  assert.equal(round.targetContext, 'final');
  game.submit({ type: 'select-extra', pieceId: 'invalid' });
  game.submit({ type: 'reset' });
  game.submit({ type: 'remove-piece', pieceId: round.originalPieces[0].id });
  game.submit({ type: 'undo' });
  game.submit({ type: 'remove-piece', pieceId: round.originalPieces[1].id });
  game.submit({ type: 'validate' });
  const metrics = game.getMetrics();
  assert.deepEqual([metrics.totalMovements, metrics.totalUndoUses, metrics.totalResetUses], [2, 1, 0]);
  assert.deepEqual([metrics.byOperation.remove.movements, metrics.results[0].movements, metrics.results[0].undoUses], [2, 2, 1]);
  assert.equal(metrics.results[0].targetContext, 'final');
});

test('clasifica posiciones medial e inicial e inversiones full y edges', () => {
  assert.equal(startOne(tomate, 'remove', c => c.position === 1).round.targetContext, 'medial');
  assert.equal(startOne(casa, 'add', c => c.position === 0, 2).round.targetContext, 'initial');
  assert.equal(startOne(tomate, 'invert', c => c.variant === 'full', 3).round.targetContext, 'full');
  assert.equal(startOne(tomate, 'invert', c => c.variant === 'edges', 3).round.targetContext, 'edges');
});
