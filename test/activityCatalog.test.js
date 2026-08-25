import test from 'node:test';
import assert from 'node:assert/strict';
import { activityComposition } from '../src/app/activityComposition.js';
import { createExerciseRegistry } from '../src/core/exerciseRegistry.js';
import { renderActivityCatalog } from '../src/ui/activityCatalog.js';

function catalog() {
  const registry = createExerciseRegistry();
  activityComposition.list().forEach(({ definition }) => registry.register(definition));
  return registry;
}

test('el catálogo incluye coming-soon, la deshabilita y excluye hidden', () => {
  const registry = catalog();
  assert.ok(registry.list().some(activity => activity.id === 'identify-rhymes'));
  assert.ok(!registry.list().some(activity => activity.id === 'legacy-phonemes'));

  const container = { innerHTML: '' };
  renderActivityCatalog(container, registry);
  assert.match(container.innerHTML, /data-activity-id="identify-rhymes"[^>]*data-status="coming-soon"[^>]* disabled/);
  assert.doesNotMatch(container.innerHTML, /legacy-phonemes/);
});
