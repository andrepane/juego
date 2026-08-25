import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityComposition, createActivityRuntime, validateController } from '../src/app/activityRuntime.js';
import { activityComposition } from '../src/app/activityComposition.js';

const definition = (id, status = 'available') => ({ id, status });
const pluginFactory = () => ({});
const configuratorFactory = () => ({});
function controller(id, counters = {}) {
  let mounted = false;
  return {
    activityId: id,
    mount() { if (!mounted) { counters.listeners = (counters.listeners ?? 0) + 1; mounted = true; } },
    openConfiguration() {}, startSession() {}, renderRound() {}, finishSession() {}, renderSummary() {},
    destroy() { if (mounted) { counters.listeners -= 1; mounted = false; } counters.destroyed = (counters.destroyed ?? 0) + 1; }
  };
}

test('valida el contrato común de los controladores', () => {
  assert.equal(validateController(controller('activity'), 'activity').activityId, 'activity');
  assert.throws(() => validateController({ activityId: 'activity' }, 'activity'), /missing method: mount/);
  assert.throws(() => validateController(controller('other'), 'activity'), /Invalid controller/);
});

test('rechaza una available incompleta y permite coming-soon sin controlador', () => {
  assert.throws(() => createActivityComposition([{ definition: definition('open'), createPlugin: pluginFactory, createConfigurator: configuratorFactory }]), /requires a controller factory/);
  const composition = createActivityComposition([{ definition: definition('later', 'coming-soon') }]);
  assert.equal(composition.get('later').definition.status, 'coming-soon');
  assert.equal(composition.resolveAvailable('later'), null);
});

test('resuelve por activityId y rechaza identificadores duplicados', () => {
  const entry = { definition: definition('one'), createPlugin: pluginFactory, createConfigurator: configuratorFactory, createController: () => controller('one') };
  const composition = createActivityComposition([entry]);
  assert.equal(composition.resolveAvailable('one'), composition.get('one'));
  assert.equal(composition.resolveAvailable('missing'), null);
  assert.throws(() => createActivityComposition([entry, entry]), /already composed/);
});

test('el runtime inicializa, limpia y no duplica listeners al remontar', () => {
  const counters = {};
  const entry = { definition: definition('one'), createPlugin: pluginFactory, createConfigurator: configuratorFactory, createController: () => controller('one', counters) };
  const composition = createActivityComposition([entry]);
  const shell = { home() { counters.home = true; } };
  const runtime = createActivityRuntime({ composition, root: {}, shell, dialogs: {} });
  assert.equal(runtime.openConfiguration('one'), true);
  runtime.getCurrentController().mount();
  assert.equal(counters.listeners, 1);
  assert.equal(runtime.openConfiguration('one'), true);
  assert.equal(counters.listeners, 1);
  assert.equal(counters.destroyed, 1);
  runtime.home();
  assert.equal(counters.listeners, 0);
  assert.equal(counters.home, true);
});

test('las dos composiciones actuales incluyen definición, plugin, controlador y configurador', () => {
  assert.deepEqual(activityComposition.list().map(item => item.definition.id).sort(), ['manipulate-syllables', 'order-syllables']);
  for (const entry of activityComposition.list()) {
    assert.equal(activityComposition.resolveAvailable(entry.definition.id), entry);
    assert.equal(typeof entry.createPlugin, 'function');
    assert.equal(typeof entry.createController, 'function');
    assert.equal(typeof entry.createConfigurator, 'function');
  }
});
