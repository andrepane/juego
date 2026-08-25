export function createExerciseRegistry() {
  const definitions = new Map();
  const statuses = new Set(['available', 'coming-soon', 'hidden']);
  const requiredStrings = ['id', 'title', 'shortDescription', 'areaId', 'areaTitle', 'icon'];
  const requiredCapabilities = ['supportsImages', 'supportsAudio', 'supportsText', 'supportsMetrics'];
  const visibleDefinitions = ({ status } = {}) => [...definitions.values()]
    .filter(definition => definition.status !== 'hidden' && (!status || definition.status === status))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, 'es'));

  return {
    register(definition) {
      if (!definition || typeof definition !== 'object') {
        throw new Error('Invalid activity definition.');
      }

      requiredStrings.forEach((field) => {
        if (typeof definition[field] !== 'string' || !definition[field].trim()) throw new Error(`Activity definition requires a non-empty string ${field}.`);
      });
      if (!statuses.has(definition.status)) throw new Error(`Activity "${definition.id}" has an invalid status.`);
      if (!Number.isFinite(definition.sortOrder)) throw new Error(`Activity "${definition.id}" requires a numeric sortOrder.`);
      if (!definition.capabilities || typeof definition.capabilities !== 'object') throw new Error(`Activity "${definition.id}" requires capabilities.`);
      requiredCapabilities.forEach((capability) => {
        if (typeof definition.capabilities[capability] !== 'boolean') throw new Error(`Activity "${definition.id}" has an invalid capability: ${capability}`);
      });
      if (definitions.has(definition.id)) throw new Error(`Activity id already registered: ${definition.id}`);
      definitions.set(definition.id, definition);
      return definition;
    },
    get(id) {
      return definitions.get(id) ?? null;
    },
    list(options) {
      return visibleDefinitions(options);
    },
    listByArea(options) {
      const areas = new Map();
      visibleDefinitions(options).forEach((definition) => {
        if (!areas.has(definition.areaId)) areas.set(definition.areaId, { id: definition.areaId, title: definition.areaTitle, description: definition.areaDescription ?? '', activities: [] });
        areas.get(definition.areaId).activities.push(definition);
      });
      return [...areas.values()];
    }
  };
}
