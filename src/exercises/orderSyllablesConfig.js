export const ORDER_LEVELS = {
  1: {
    id: 1,
    label: 'Nivel 1',
    description: 'Palabras de dos sílabas con una estructura sencilla, como casa.',
    linguisticFilters: {
      syllableCount: 2,
      frequency: [1, 2],
      structure: ['CV-CV']
    }
  },
  2: {
    id: 2,
    label: 'Nivel 2',
    description: 'Palabras de tres sílabas con una estructura sencilla, como tomate.',
    linguisticFilters: {
      syllableCount: 3,
      structure: ['CV-CV-CV', 'V-CV-CV']
    }
  },
  3: {
    id: 3,
    label: 'Nivel 3',
    description: 'Palabras con sílabas mixtas o trabadas, como cristal.',
    linguisticFilters: {
      complexity: ['mixed', 'trabadas']
    }
  }
};

export const ORDER_MODES = {
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'Sin carga cognitiva extra. Solo orden lingüístico.',
    enabled: true
  },
  intruders: {
    id: 'intruders',
    label: 'Intrusos',
    description: 'Variante cognitiva con sílabas distractoras.',
    enabled: false
  }
};

export function resolveOrderLevel(levelId = 1) {
  return ORDER_LEVELS[levelId] ?? ORDER_LEVELS[1];
}

export function resolveOrderMode(modeId = 'normal') {
  const candidate = ORDER_MODES[modeId] ?? ORDER_MODES.normal;
  return candidate.enabled ? candidate : ORDER_MODES.normal;
}
