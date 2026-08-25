export function createExerciseRegistry() {
  const plugins = new Map();
  const statuses = new Set(['available', 'coming-soon', 'hidden']);
  const requiredStrings = ['id', 'title', 'shortDescription', 'areaId', 'areaTitle', 'icon'];
  const requiredCapabilities = ['supportsImages', 'supportsAudio', 'supportsText', 'supportsMetrics'];
  const visiblePlugins = ({ status } = {}) => [...plugins.values()]
    .filter(plugin => plugin.status !== 'hidden' && (!status || plugin.status === status))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, 'es'));

  return {
    register(plugin) {
      if (!plugin || typeof plugin !== 'object') {
        throw new Error('Invalid plugin definition.');
      }

      requiredStrings.forEach((field) => {
        if (typeof plugin[field] !== 'string' || !plugin[field].trim()) throw new Error(`Plugin requires a non-empty string ${field}.`);
      });
      if (!statuses.has(plugin.status)) throw new Error(`Plugin "${plugin.id}" has an invalid status.`);
      if (!Number.isFinite(plugin.sortOrder)) throw new Error(`Plugin "${plugin.id}" requires a numeric sortOrder.`);
      if (!plugin.capabilities || typeof plugin.capabilities !== 'object') throw new Error(`Plugin "${plugin.id}" requires capabilities.`);
      requiredCapabilities.forEach((capability) => {
        if (typeof plugin.capabilities[capability] !== 'boolean') throw new Error(`Plugin "${plugin.id}" has an invalid capability: ${capability}`);
      });
      if (plugins.has(plugin.id)) throw new Error(`Plugin id already registered: ${plugin.id}`);

      const requiredMethods = ['start', 'submit', 'next', 'getMetrics'];
      requiredMethods.forEach((methodName) => {
        if (typeof plugin[methodName] !== 'function') {
          throw new Error(`Plugin "${plugin.id}" is missing method: ${methodName}`);
        }
      });

      const optionalMethods = ['restartRound', 'skipRound', 'finishSession', 'getSessionState'];
      optionalMethods.forEach((methodName) => {
        if (methodName in plugin && typeof plugin[methodName] !== 'function') throw new Error(`Plugin "${plugin.id}" has an invalid optional method: ${methodName}`);
      });

      plugins.set(plugin.id, plugin);
      return plugin;
    },
    get(id) {
      return plugins.get(id) ?? null;
    },
    list(options) {
      return visiblePlugins(options);
    },
    listByArea(options) {
      const areas = new Map();
      visiblePlugins(options).forEach((plugin) => {
        if (!areas.has(plugin.areaId)) areas.set(plugin.areaId, { id: plugin.areaId, title: plugin.areaTitle, description: plugin.areaDescription ?? '', activities: [] });
        areas.get(plugin.areaId).activities.push(plugin);
      });
      return [...areas.values()];
    }
  };
}
