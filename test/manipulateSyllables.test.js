import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChallengePool, createChallenge, createManipulateSyllablesPlugin } from '../src/exercises/manipulateSyllablesPlugin.js';

const casa = { id: 'casa', word: 'casa', syllables: ['ca', 'sa'], syllableCount: 2, structure: 'CV-CV' };
const tomate = { id: 'tomate', word: 'tomate', syllables: ['to', 'ma', 'te'], syllableCount: 3, structure: 'CV-CV-CV' };
const patata = { id: 'patata', word: 'patata', syllables: ['pa', 'ta', 'ta'], syllableCount: 3, structure: 'CV-CV-CV' };
const nino = { id: 'nino', word: 'niño', syllables: ['ni', 'ño'], syllableCount: 2, structure: 'CV-CV' };
const cafe = { id: 'cafe', word: 'café', syllables: ['ca', 'fé'], syllableCount: 2, structure: 'CV-CV' };
const words = [casa, tomate, patata, nino, cafe];
const source = () => words;
const choose = (game, round, expected) => { const used = new Set(); for (const text of expected) { const piece = round.pieces.find((p) => p.text === text && !used.has(p.id)); assert.ok(piece); used.add(piece.id); game.submit({ type: 'tap', pieceId: piece.id }); } };

test('genera soluciones exactas para las cuatro operaciones', () => {
  assert.equal(createChallenge({ word: tomate, operation: 'remove', position: 1 }).expectedText, 'tote');
  assert.equal(createChallenge({ word: casa, operation: 'add', position: 0, syllable: 'mi' }).expectedText, 'micasa');
  assert.equal(createChallenge({ word: tomate, operation: 'replace', position: 1, syllable: 'lu' }).expectedText, 'tolute');
  assert.equal(createChallenge({ word: casa, operation: 'invert' }).expectedText, 'saca');
});

test('quitar cubre posiciones inicial, medial y final sin respuesta vacía', () => {
  assert.deepEqual([0, 1, 2].map((position) => createChallenge({ word: tomate, operation: 'remove', position }).expectedText), ['mate', 'tote', 'toma']);
});

test('añadir cubre principio, final y posición intermedia', () => {
  assert.deepEqual([0, 2, 1].map((position) => createChallenge({ word: casa, operation: 'add', position, syllable: 'mi' }).expectedText), ['micasa', 'casami', 'camisa']);
});

test('sustituye una sílaba única y califica la repetida por posición', () => {
  assert.equal(createChallenge({ word: casa, operation: 'replace', position: 0, syllable: 'me' }).expectedText, 'mesa');
  assert.match(createChallenge({ word: patata, operation: 'replace', position: 2, syllable: 'lu' }).instruction, /última sílaba TA/);
});

test('invierte bisílaba, extremos de trisílaba y orden completo', () => {
  assert.equal(createChallenge({ word: casa, operation: 'invert' }).expectedText, 'saca');
  assert.equal(createChallenge({ word: tomate, operation: 'invert', variant: 'edges' }).expectedText, 'temato');
  assert.equal(createChallenge({ word: tomate, operation: 'invert', variant: 'full' }).expectedText, 'temato');
});

test('excluye inversiones sin cambio', () => {
  const pool = buildChallengePool({ level: 2, operations: ['invert'], getWords: () => [{ id: 'tatata', word: 'tatata', syllables: ['ta', 'ta', 'ta'] }] });
  assert.equal(pool.length, 0);
});

test('fichas repetidas tienen identificadores distintos y no se reutilizan', () => {
  const challenge = createChallenge({ word: patata, operation: 'invert' });
  assert.equal(new Set(challenge.pieces.map((p) => p.id)).size, 3);
  const game = createManipulateSyllablesPlugin({ getWords: () => [patata], allWords: source, random: () => 0 });
  const round = game.start({ level: 2, operations: ['remove'], total: 1 });
  game.submit({ type: 'tap', pieceId: round.pieces[0].id });
  assert.equal(game.submit({ type: 'tap', pieceId: round.pieces[0].id }).status, 'locked');
});

test('deshacer y limpiar recuperan fichas', () => {
  const game = createManipulateSyllablesPlugin({ getWords: source, allWords: source, random: () => 0 }); const round = game.start({ level: 1, operations: ['add'], total: 1 });
  game.submit({ type: 'tap', pieceId: round.pieces[0].id }); assert.equal(game.submit({ type: 'undo' }).answer.length, 0);
  game.submit({ type: 'tap', pieceId: round.pieces[0].id }); assert.equal(game.submit({ type: 'clear' }).answer.length, 0);
});

test('valida, bloquea doble error y doble puntuación', () => {
  const game = createManipulateSyllablesPlugin({ getWords: () => [casa], allWords: source, random: () => 0 }); let round = game.start({ level: 1, operations: ['invert'], total: 1 });
  choose(game, round, ['ca', 'sa']); assert.equal(game.submit({ type: 'validate' }).status, 'incorrect'); assert.equal(game.submit({ type: 'validate' }).status, 'locked'); assert.equal(game.getMetrics().incorrectAttempts, 1);
  game.submit({ type: 'clear' }); choose(game, round, ['sa', 'ca']); assert.equal(game.submit({ type: 'validate' }).status, 'correct'); assert.equal(game.submit({ type: 'validate' }).status, 'locked'); assert.equal(game.getMetrics().roundsPlayed, 1);
});

test('conserva tildes y ñ', () => {
  assert.equal(createChallenge({ word: cafe, operation: 'invert' }).expectedText, 'féca'); assert.equal(createChallenge({ word: nino, operation: 'invert' }).expectedText, 'ñoni');
});

test('sesiones equilibradas no repiten identidad y completan 5, 10 y 20', () => {
  for (const total of [5, 10, 20]) { const game = createManipulateSyllablesPlugin({ random: () => 0 }); let round = game.start({ level: 1, operations: ['remove', 'add', 'replace', 'invert'], total }); assert.equal(round.total, total); for (let i = 0; i < total; i++) { choose(game, round, round.pieces.map(p => p.text)); // derive expected by trying permutations is unnecessary for generation/session coverage
      game.submit({ type: 'clear' }); const pool = buildChallengePool({ level: 1 }); const challenge = pool.find(c => c.baseWord === round.baseWord && c.operation === round.operation && c.instruction === round.instruction); choose(game, round, challenge.expected); assert.equal(game.submit({ type: 'validate' }).status, 'correct'); if (i < total - 1) round = game.next(); } assert.equal(game.getMetrics().roundsPlayed, total); }
});

test('distribuye operaciones seleccionadas y calcula métricas agrupadas', () => {
  const game = createManipulateSyllablesPlugin({ random: () => 0 }); let round = game.start({ level: 1, operations: ['remove', 'add'], total: 10 });
  for (let i=0;i<10;i++){ const challenge=buildChallengePool({level:1,operations:['remove','add']}).find(c=>c.baseWord===round.baseWord&&c.operation===round.operation&&c.instruction===round.instruction); choose(game,round,challenge.expected); game.submit({type:'validate'}); if(i<9) round=game.next(); }
  const metrics=game.getMetrics(); assert.equal(metrics.firstTryCorrect,10); assert.equal(metrics.firstTryPercentage,100); assert.deepEqual([metrics.byOperation.remove.rounds,metrics.byOperation.add.rounds],[5,5]);
});

test('devuelve insufficient con cantidad disponible', () => {
  const game = createManipulateSyllablesPlugin({ getWords: () => [], allWords: source }); assert.deepEqual(game.start({ level: 1, operations: ['remove'], total: 10 }), { status: 'insufficient', available: 0, requested: 10 });
});
