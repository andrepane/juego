const CAPABILITIES = Object.freeze({ supportsImages: false, supportsAudio: false, supportsText: true, supportsMetrics: true });

export const ACTIVITY_DEFINITIONS = Object.freeze({
  'order-syllables': Object.freeze({
    id: 'order-syllables', title: 'Ordenar sílabas', shortDescription: 'Organiza las sílabas para formar una palabra.',
    areaId: 'syllabic-awareness', areaTitle: 'Conciencia silábica', areaDescription: 'Actividades para reconocer, ordenar y transformar las sílabas de las palabras.',
    icon: 'A · MI · GO', status: 'available', sortOrder: 10, capabilities: CAPABILITIES
  }),
  'manipulate-syllables': Object.freeze({
    id: 'manipulate-syllables', title: 'Manipular sílabas', shortDescription: 'Quita, añade, cambia o invierte sílabas para construir un nuevo resultado.',
    areaId: 'syllabic-awareness', areaTitle: 'Conciencia silábica', areaDescription: 'Actividades para reconocer, ordenar y transformar las sílabas de las palabras.',
    icon: 'CA ↔ SA', status: 'available', sortOrder: 20, capabilities: CAPABILITIES
  })
});

export const ACTIVITY_IDS = Object.freeze(Object.keys(ACTIVITY_DEFINITIONS));
export const getActivityDefinition = id => ACTIVITY_DEFINITIONS[id] ?? null;
