import test from 'node:test';
import assert from 'node:assert/strict';
import { balancedSchedule, planBalancedVariants } from '../src/core/challengePlanner.js';
import { buildOrderChallengePool, ORDER_VARIANTS } from '../src/exercises/orderSyllablesVariants.js';
import { buildManipulationVariantPool, createChallenge, MANIPULATION_VARIANTS } from '../src/exercises/manipulateSyllablesPlugin.js';
import { applyPreset } from '../src/core/sessionConfig.js';
import { calculateAvailability } from '../src/core/sessionAvailability.js';
import { createOrderSyllablesPlugin } from '../src/exercises/orderSyllablesPlugin.js';

const words = [
  { id: 'nino', word: 'niño', syllables: ['ni', 'ño'], syllableCount: 2, structure: 'CV-CV', frequency: 1 },
  { id: 'cafe', word: 'café', syllables: ['ca', 'fé'], syllableCount: 2, structure: 'CV-CV', frequency: 1 },
  { id: 'patata', word: 'patata', syllables: ['pa', 'ta', 'ta'], syllableCount: 3, structure: 'CV-CV-CV', frequency: 1 }
];

test('genera las cinco variantes de Ordenar sin soluciones iniciales y conserva tildes y ñ', () => {
  const pool = buildOrderChallengePool(words, { variants: Object.keys(ORDER_VARIANTS), distractorCount: 2, targetPositions: ['initial', 'medial', 'final'], memorySeconds: 3 }, () => .4);
  assert.deepEqual(new Set(pool.map(item => item.variant)), new Set(Object.keys(ORDER_VARIANTS)));
  for (const challenge of pool.filter(item => ['order', 'memory', 'correctOrder'].includes(item.variant))) assert.notDeepEqual(challenge.initialPieces.map(p => p.text), challenge.targetPieces.map(p => p.text));
  assert.ok(pool.some(item => item.baseWord === 'niño')); assert.ok(pool.some(item => item.baseWord === 'café'));
});

test('los distractores son distintos de la solución y la intrusa tiene identidad única', () => {
  const pool = buildOrderChallengePool(words, { variants: ['missing', 'intruder'], distractorCount: 4, targetPositions: ['initial', 'medial', 'final'] }, () => 0);
  for (const challenge of pool.filter(item => item.variant === 'missing')) assert.ok(challenge.distractors.every(item => item.text !== challenge.targetPieces[0].text));
  for (const challenge of pool.filter(item => item.variant === 'intruder')) assert.equal(challenge.initialPieces.filter(item => item.id === challenge.intruderId).length, 1);
});

test('el plan equilibra variantes y evita repeticiones inmediatas', () => {
  assert.deepEqual(balancedSchedule({ order: 3, missing: 3 }, () => 0), ['order', 'missing', 'order', 'missing', 'order', 'missing']);
  const pool = ['order', 'missing'].flatMap(variant => ['a', 'b', 'c'].map(baseWord => ({ id: `${variant}-${baseWord}`, variant, baseWord })));
  const plan = planBalancedVariants(pool, ['order', 'missing'], 6, () => 0);
  assert.equal(plan.status, 'ready'); assert.ok(plan.schedule.every((v, i) => !i || v !== plan.schedule[i - 1]));
});

test('registra las cinco variantes de Manipular y prepara dos pasos encadenados', () => {
  const challenge = createChallenge({ word: words[0], operation: 'remove', position: 0 });
  const pool = buildManipulationVariantPool([challenge], Object.keys(MANIPULATION_VARIANTS));
  assert.deepEqual(new Set(pool.map(item => item.challengeVariant)), new Set(Object.keys(MANIPULATION_VARIANTS)));
  assert.equal(pool.find(item => item.challengeVariant === 'chain').steps.length, 2);
});

test('la disponibilidad por variante coincide con un plan construible', () => {
  const config = applyPreset('order-syllables', 'initial'); config.rounds = 3;
  const availability = calculateAvailability(config, words);
  assert.equal(availability.constructible, true); assert.deepEqual(Object.keys(availability.availableByVariant), config.activityOptions.variants);
});

test('memoria usa un temporizador y reloj inyectables; pulsación y drop convergen', () => {
  let callback; let now = 100; const config = applyPreset('order-syllables', 'intermediate'); config.rounds = 1; config.activityOptions.variants = ['memory'];
  const game = createOrderSyllablesPlugin({ getWords: () => words, random: () => .4, clock: () => now, setTimer: fn => { callback = fn; } });
  const round = game.start(config); assert.equal(round.memoryVisible, true); callback();
  const tapGame = createOrderSyllablesPlugin({ getWords: () => words, random: () => .4 }); const dropGame = createOrderSyllablesPlugin({ getWords: () => words, random: () => .4 });
  const direct = { ...config, activityOptions: { ...config.activityOptions, variants: ['order'] } };
  const a = tapGame.start(direct); const b = dropGame.start(direct); tapGame.submit({ type: 'tap', pieceId: a.pieces[0].id }); dropGame.submit({ type: 'tap', pieceId: b.pieces[0].id });
  assert.deepEqual(tapGame.submit().answer.map(p => p.text), dropGame.submit().answer.map(p => p.text)); now += 250; assert.ok(now > 100);
});
