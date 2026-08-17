import test from 'node:test';
import assert from 'node:assert/strict';
import { getFilteredWords, getWordComplexity, normalizeSpanish } from '../src/core/wordUtils.js';
import { ORDER_LEVELS } from '../src/exercises/orderSyllablesConfig.js';
import {
  calculateRoundProgress,
  createOrderSyllablesPlugin,
  ensureReorderedSyllables,
  isCorrectSyllableAnswer,
  isOrderableWord
} from '../src/exercises/orderSyllablesPlugin.js';

const selectableWords = (level) => getFilteredWords(ORDER_LEVELS[level].linguisticFilters).filter(isOrderableWord);

function selectPieces(game, round, syllables) {
  const used = new Set();
  for (const syllable of syllables) {
    const piece = round.pieces.find((candidate) => candidate.text === syllable && !used.has(candidate.id));
    assert.ok(piece, `No se encontró una pieza para ${syllable}`);
    used.add(piece.id);
    game.submit({ type: 'tap', pieceId: piece.id });
  }
}

function completeSession(level, total) {
  const game = createOrderSyllablesPlugin({ random: () => 0 });
  let round = game.start({ level, resetScore: true });
  const ids = [];
  for (let index = 0; index < total; index += 1) {
    assert.equal(round.status, 'ready');
    ids.push(round.wordId);
    const word = selectableWords(level).find((candidate) => candidate.id === round.wordId);
    selectPieces(game, round, word.syllables);
    assert.equal(game.submit({ type: 'validate' }).status, 'correct');
    if (index < total - 1) round = game.next();
  }
  assert.equal(game.getMetrics().roundsPlayed, total);
  assert.equal(new Set(ids).size, total);
  return ids;
}

test('todas las candidatas son jugables y cada nivel conserva al menos 20', () => {
  for (const level of [1, 2, 3]) {
    const words = selectableWords(level);
    assert.ok(words.length >= 20, `Nivel ${level}: ${words.length} palabras jugables`);
    assert.ok(words.every((word) => word.syllables.length >= 2));
    assert.ok(words.every((word) => ensureReorderedSyllables(word.syllables, () => 0)?.join('|') !== word.syllables.join('|')));
  }
  assert.ok(getFilteredWords(ORDER_LEVELS[3].linguisticFilters).every((word) => ['mixed', 'trabadas'].includes(getWordComplexity(word))));
});

test('pan y papa no son jugables ni aparecen en rondas', () => {
  const pan = getFilteredWords(ORDER_LEVELS[3].linguisticFilters).find((word) => word.word === 'pan');
  const papa = getFilteredWords(ORDER_LEVELS[1].linguisticFilters).find((word) => word.word === 'papa');
  assert.equal(isOrderableWord(pan), false);
  assert.equal(isOrderableWord(papa), false);
  assert.ok(!selectableWords(3).some((word) => word.word === 'pan'));
  assert.ok(!selectableWords(1).some((word) => word.word === 'papa'));
});

test('patata, con sílabas repetidas, sigue siendo jugable', () => {
  const patata = getFilteredWords(ORDER_LEVELS[2].linguisticFilters).find((word) => word.word === 'patata');
  assert.ok(patata);
  assert.equal(isOrderableWord(patata), true);
  const result = ensureReorderedSyllables(patata.syllables, () => 0);
  assert.notDeepEqual(result, patata.syllables);
  assert.deepEqual([...result].sort(), [...patata.syllables].sort());
  const game = createOrderSyllablesPlugin({ getWords: () => [patata], random: () => 0 });
  assert.equal(game.start({ level: 2 }).wordId, patata.id);
});

test('ensureReorderedSyllables no muta y conserva todas las piezas repetidas', () => {
  const source = ['pa', 'ta', 'ta'];
  const copy = [...source];
  const result = ensureReorderedSyllables(source, () => 0);
  assert.deepEqual(source, copy);
  assert.notStrictEqual(result, source);
  assert.notDeepEqual(result, source);
  assert.deepEqual([...result].sort(), [...source].sort());
});

test('una combinación imposible devuelve un resultado controlado', () => {
  const source = ['pa', 'pa'];
  assert.equal(ensureReorderedSyllables(source, () => 0), null);
  assert.deepEqual(source, ['pa', 'pa']);
});

test('corrige respuestas conservando tildes y ñ', () => {
  assert.ok(isCorrectSyllableAnswer(['ni', 'ño'], ['ni', 'ño']));
  assert.ok(isCorrectSyllableAnswer(['ca', 'fé'], ['ca', 'fé']));
  assert.notEqual(normalizeSpanish('año'), normalizeSpanish('ano'));
  assert.notEqual(normalizeSpanish('café'), normalizeSpanish('cafe'));
});

test('una pieza solo se usa una vez', () => {
  const game = createOrderSyllablesPlugin({ random: () => 0 });
  const round = game.start({ level: 1, resetScore: true });
  game.submit({ type: 'tap', pieceId: round.pieces[0].id });
  const again = game.submit({ type: 'tap', pieceId: round.pieces[0].id });
  assert.equal(again.status, 'locked');
  assert.equal(again.answer.length, 1);
});

test('la misma respuesta incorrecta solo se registra una vez hasta que cambia', () => {
  const game = createOrderSyllablesPlugin({ random: () => 0 });
  const round = game.start({ level: 1, resetScore: true });
  selectPieces(game, round, round.pieces.map((piece) => piece.text));
  assert.equal(game.submit({ type: 'validate' }).status, 'incorrect');
  assert.equal(game.submit({ type: 'validate' }).status, 'locked');
  assert.equal(game.getMetrics().incorrectAttempts, 1);
  game.submit({ type: 'undo' });
  const removed = round.pieces.find((piece) => !game.submit().answer.some((answer) => answer.id === piece.id));
  game.submit({ type: 'tap', pieceId: removed.id });
  assert.equal(game.submit({ type: 'validate' }).status, 'incorrect');
  assert.equal(game.getMetrics().incorrectAttempts, 2);
});

test('una doble validación correcta suma como máximo un punto', () => {
  const game = createOrderSyllablesPlugin({ random: () => 0 });
  const round = game.start({ level: 1, resetScore: true });
  const word = selectableWords(1).find((candidate) => candidate.id === round.wordId);
  selectPieces(game, round, word.syllables);
  assert.equal(game.submit({ type: 'validate' }).status, 'correct');
  assert.equal(game.submit({ type: 'validate' }).status, 'locked');
  assert.equal(game.getMetrics().score, 1);
  assert.equal(game.getMetrics().roundsPlayed, 1);
});

test('el motor devuelve empty de forma segura sin candidatas', () => {
  const game = createOrderSyllablesPlugin({ getWords: () => [] });
  assert.deepEqual(game.start({ level: 1, resetScore: true }), { status: 'empty' });
  assert.deepEqual(game.submit({ type: 'validate' }), { status: 'empty' });
  assert.equal(game.getMetrics().roundsPlayed, 0);
  assert.equal(game.getMetrics().incorrectAttempts, 0);
});

test('el progreso de cinco rondas es 20, 40, 60, 80 y 100', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((round) => calculateRoundProgress(round, 5)), [20, 40, 60, 80, 100]);
});

test('sesión completa de 20 rondas sin repeticiones en los tres niveles', () => {
  for (const level of [1, 2, 3]) {
    const ids = completeSession(level, 20);
    assert.equal(new Set(ids).size, 20);
  }
});
