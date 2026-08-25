const CONTROLLER_METHODS = ['mount', 'openConfiguration', 'startSession', 'renderRound', 'finishSession', 'renderSummary', 'destroy'];
const PLUGIN_METHODS = ['start', 'submit', 'next', 'getMetrics'];

export function validatePlugin(plugin, activityId) {
  if (!plugin || typeof plugin !== 'object' || plugin.id !== activityId) throw new Error(`Invalid plugin for "${activityId}".`);
  PLUGIN_METHODS.forEach(method => { if (typeof plugin[method] !== 'function') throw new Error(`Plugin "${activityId}" is missing method: ${method}`); });
  return plugin;
}

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
    activities.set(id, Object.freeze({ ...entry }));
  }
  return {
    get: id => activities.get(id) ?? null,
    list: () => [...activities.values()],
    resolveAvailable(id) {
      const entry = activities.get(id);
      return entry?.definition.status === 'available'
        && typeof entry.createPlugin === 'function'
        && typeof entry.createController === 'function'
        && typeof entry.createConfigurator === 'function' ? entry : null;
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
    const plugin = validatePlugin(entry.createPlugin(), activityId);
    current = validateController(entry.createController({ plugin, root, shell, dialogs, createConfigurator: entry.createConfigurator }), activityId);
    current.mount(); current.openConfiguration();
    return true;
  }
  function home() { current?.destroy(); current = null; shell.home(); }
  return { resolve, openConfiguration, home, getCurrentController: () => current, destroy: home };
}
