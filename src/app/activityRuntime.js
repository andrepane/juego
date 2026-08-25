const CONTROLLER_METHODS = ['mount', 'openConfiguration', 'startSession', 'renderRound', 'finishSession', 'renderSummary', 'destroy'];

export function validateController(controller, activityId = controller?.activityId) {
  if (!controller || typeof controller !== 'object' || controller.activityId !== activityId) throw new Error(`Invalid controller for "${activityId}".`);
  CONTROLLER_METHODS.forEach(method => { if (typeof controller[method] !== 'function') throw new Error(`Controller "${activityId}" is missing method: ${method}`); });
  return controller;
}

export function createActivityComposition(entries) {
  const activities = new Map();
  for (const entry of entries) {
    const id = entry?.definition?.id;
    if (!id) throw new Error('Activity composition requires a definition with an id.');
    if (activities.has(id)) throw new Error(`Activity id already composed: ${id}`);
    const available = entry.definition.status === 'available';
    if (available && typeof entry.createPlugin !== 'function') throw new Error(`Available activity "${id}" requires a plugin factory.`);
    if (available && typeof entry.createController !== 'function') throw new Error(`Available activity "${id}" requires a controller factory.`);
    if (available && typeof entry.createConfigurator !== 'function') throw new Error(`Available activity "${id}" requires a configurator factory.`);
    activities.set(id, Object.freeze({ ...entry }));
  }
  return {
    get: id => activities.get(id) ?? null,
    list: () => [...activities.values()],
    resolveAvailable(id) {
      const entry = activities.get(id);
      return entry?.definition.status === 'available' && entry.createPlugin && entry.createController && entry.createConfigurator ? entry : null;
    }
  };
}

export function createActivityRuntime({ composition, root, shell, dialogs }) {
  let current = null;
  function resolve(activityId) { return composition.resolveAvailable(activityId); }
  function openConfiguration(activityId) {
    const entry = resolve(activityId);
    if (!entry) return false;
    current?.destroy();
    const plugin = entry.createPlugin();
    current = validateController(entry.createController({ plugin, root, shell, dialogs, createConfigurator: entry.createConfigurator }), activityId);
    current.mount(); current.openConfiguration();
    return true;
  }
  function home() { current?.destroy(); current = null; shell.home(); }
  return { resolve, openConfiguration, home, getCurrentController: () => current, destroy: home };
}
