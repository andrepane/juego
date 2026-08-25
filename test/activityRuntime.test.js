import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityComposition, createActivityRuntime, validateController, validatePlugin } from '../src/app/activityRuntime.js';
import { activityComposition } from '../src/app/activityComposition.js';

const definition = (id, status = 'available') => ({ id, status });
const pluginFactory = (id = 'one') => () => ({ id, start() {}, submit() {}, next() {}, getMetrics() {} });
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

test('valida el contrato del plugin antes de montar el controlador', () => {
  assert.equal(validatePlugin(pluginFactory('activity')(), 'activity').id, 'activity');
  assert.throws(() => validatePlugin({ id: 'activity' }, 'activity'), /missing method: start/);
  const composition = createActivityComposition([{ definition: definition('broken'), createPlugin: () => ({}), createConfigurator: configuratorFactory, createController: () => controller('broken') }]);
  const runtime = createActivityRuntime({ composition, root: {}, shell: { home() {} }, dialogs: {} });
  assert.throws(() => runtime.openConfiguration('broken'), /Invalid plugin/);
  assert.equal(runtime.getCurrentController(), null);
});

test('no resuelve una available incompleta y permite coming-soon sin controlador', () => {
  const incomplete = createActivityComposition([{ definition: definition('open'), createPlugin: pluginFactory, createConfigurator: configuratorFactory }]);
  assert.equal(incomplete.resolveAvailable('open'), null);
  const runtime = createActivityRuntime({ composition: incomplete, root: {}, shell: { home() {} }, dialogs: {} });
  assert.equal(runtime.openConfiguration('open'), false);
  const composition = createActivityComposition([{ definition: definition('later', 'coming-soon') }]);
  assert.equal(composition.get('later').definition.status, 'coming-soon');
  assert.equal(composition.resolveAvailable('later'), null);
});

test('resuelve por activityId y rechaza identificadores duplicados', () => {
  const entry = { definition: definition('one'), createPlugin: pluginFactory(), createConfigurator: configuratorFactory, createController: () => controller('one') };
  const composition = createActivityComposition([entry]);
  assert.equal(composition.resolveAvailable('one'), composition.get('one'));
  assert.equal(composition.resolveAvailable('missing'), null);
  assert.throws(() => createActivityComposition([entry, entry]), /already composed/);
});

test('el runtime inicializa, limpia y no duplica listeners al remontar', () => {
  const counters = {};
  const entry = { definition: definition('one'), createPlugin: pluginFactory(), createConfigurator: configuratorFactory, createController: () => controller('one', counters) };
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

test('las actividades disponibles incluyen definición, plugin, controlador y configurador', () => {
  const executable = activityComposition.list().filter(item => item.definition.status === 'available');
  assert.deepEqual(executable.map(item => item.definition.id).sort(), ['manipulate-syllables', 'order-letters', 'order-syllables']);
  for (const entry of executable) {
    assert.equal(activityComposition.resolveAvailable(entry.definition.id), entry);
    assert.equal(typeof entry.createPlugin, 'function');
    assert.equal(typeof entry.createController, 'function');
    assert.equal(typeof entry.createConfigurator, 'function');
  }
  assert.equal(activityComposition.resolveAvailable('identify-rhymes'), null);
  assert.equal(activityComposition.resolveAvailable('legacy-phonemes'), null);
});
