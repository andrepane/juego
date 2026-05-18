export function createExerciseRegistry() {
  const plugins = new Map();

  return {
    register(plugin) {
      if (!plugin || typeof plugin !== 'object') {
        throw new Error('Invalid plugin definition.');
      }

      if (!plugin.id || typeof plugin.id !== 'string') {
        throw new Error('Plugin requires a string id.');
      }

      const requiredMethods = ['start', 'submit', 'next', 'getMetrics'];
      requiredMethods.forEach((methodName) => {
        if (typeof plugin[methodName] !== 'function') {
          throw new Error(`Plugin "${plugin.id}" is missing method: ${methodName}`);
        }
      });

      plugins.set(plugin.id, plugin);
      return plugin;
    },
    get(id) {
      return plugins.get(id) ?? null;
    }
  };
}
