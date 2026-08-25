import test from 'node:test';
import assert from 'node:assert/strict';
import { createExerciseRegistry } from '../src/core/exerciseRegistry.js';
import { ACTIVITY_DEFINITIONS, ACTIVITY_IDS } from '../src/exercises/activityDefinitions.js';

const plugin = (overrides = {}) => ({
  id: 'test', title: 'Actividad', shortDescription: 'Descripción breve', areaId: 'area', areaTitle: 'Área', icon: 'AB',
  status: 'available', sortOrder: 10,
  capabilities: { supportsImages: false, supportsAudio: false, supportsText: true, supportsMetrics: true },
  ...overrides
});

test('valida todos los metadatos y capacidades obligatorios', () => {
  for (const field of ['title', 'shortDescription', 'areaId', 'areaTitle', 'icon']) {
    assert.throws(() => createExerciseRegistry().register(plugin({ [field]: '' })), new RegExp(field));
  }
  assert.throws(() => createExerciseRegistry().register(plugin({ status: 'draft' })), /status/);
  assert.throws(() => createExerciseRegistry().register(plugin({ sortOrder: '10' })), /sortOrder/);
  assert.throws(() => createExerciseRegistry().register(plugin({ capabilities: { ...plugin().capabilities, supportsAudio: null } })), /supportsAudio/);
});

test('rechaza identificadores duplicados sin sustituir la definición original', () => {
  const registry = createExerciseRegistry(); const original = registry.register(plugin());
  assert.throws(() => registry.register(plugin({ title: 'Duplicada' })), /already registered/);
  assert.equal(registry.get('test'), original);
});

test('list ordena por sortOrder, permite consultar disponibles y excluye hidden', () => {
  const registry = createExerciseRegistry();
  registry.register(plugin({ id: 'later', sortOrder: 30 }));
  registry.register(plugin({ id: 'hidden', status: 'hidden', sortOrder: 1 }));
  registry.register(plugin({ id: 'soon', status: 'coming-soon', sortOrder: 20 }));
  registry.register(plugin({ id: 'first', sortOrder: 10 }));
  assert.deepEqual(registry.list().map(item => item.id), ['first', 'soon', 'later']);
  assert.deepEqual(registry.list({ status: 'available' }).map(item => item.id), ['first', 'later']);
  assert.equal(registry.get('hidden').status, 'hidden');
});

test('listByArea agrupa áreas y conserva el orden de sus actividades', () => {
  const registry = createExerciseRegistry();
  registry.register(plugin({ id: 'b', areaId: 'second', areaTitle: 'Segunda', sortOrder: 20 }));
  registry.register(plugin({ id: 'a2', sortOrder: 15 }));
  registry.register(plugin({ id: 'a1', sortOrder: 5 }));
  assert.deepEqual(registry.listByArea().map(area => [area.id, area.activities.map(item => item.id)]), [['area', ['a1', 'a2']], ['second', ['b']]]);
});

test('las actividades actuales comparten la fuente central y se registran', () => {
  const registry = createExerciseRegistry();
  ACTIVITY_IDS.forEach(id => registry.register(ACTIVITY_DEFINITIONS[id]));
  assert.deepEqual(registry.list().map(item => item.id), ['order-syllables', 'manipulate-syllables', 'order-letters', 'identify-rhymes']);
  assert.equal(registry.get('legacy-phonemes').status, 'hidden');
  assert.ok(['order-syllables', 'manipulate-syllables', 'order-letters'].every(id => registry.get(id).capabilities.supportsMetrics));
});
