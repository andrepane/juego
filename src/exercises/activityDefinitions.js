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
  }),
  'order-letters': Object.freeze({
    id: 'order-letters', title: 'Ordenar letras', shortDescription: 'Reconstruye palabras, completa huecos y detecta letras intrusas.',
    areaId: 'phonological-awareness', areaTitle: 'Conciencia fonológica', areaDescription: 'Actividades para reconocer y comparar los sonidos de las palabras.',
    icon: 'L · E · T · R · A', status: 'available', sortOrder: 25, capabilities: CAPABILITIES
  }),
  'identify-rhymes': Object.freeze({
    id: 'identify-rhymes', title: 'Identificar rimas', shortDescription: 'Encuentra palabras que terminan con sonidos parecidos.',
    areaId: 'phonological-awareness', areaTitle: 'Conciencia fonológica', areaDescription: 'Actividades para reconocer y comparar los sonidos de las palabras.',
    icon: 'SOL · COL', status: 'coming-soon', sortOrder: 30, capabilities: CAPABILITIES
  }),
  'legacy-phonemes': Object.freeze({
    id: 'legacy-phonemes', title: 'Fonemas', shortDescription: 'Actividad interna no publicada.',
    areaId: 'phonological-awareness', areaTitle: 'Conciencia fonológica', areaDescription: 'Actividades para reconocer y comparar los sonidos de las palabras.',
    icon: 'F · O · N', status: 'hidden', sortOrder: 40, capabilities: CAPABILITIES
  })
});

export const ACTIVITY_IDS = Object.freeze(Object.keys(ACTIVITY_DEFINITIONS));
export const AVAILABLE_ACTIVITY_IDS = Object.freeze(ACTIVITY_IDS.filter(id => ACTIVITY_DEFINITIONS[id].status === 'available'));
export const getActivityDefinition = id => ACTIVITY_DEFINITIONS[id] ?? null;
