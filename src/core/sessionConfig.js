export const ACTIVITY_IDS = ['order-syllables', 'manipulate-syllables'];
export const DEFAULT_SESSION_MODE = 'supervised';

export const SESSION_MODES = Object.freeze({
  therapist: Object.freeze({ id: 'therapist', label: 'Modo terapeuta', description: 'Control completo durante la sesión.', showProfessionalControls: true, alwaysShowHelp: false, allowSkip: true, allowEarlyFinish: true, allowRoundRestart: true, explicitFeedback: false }),
  supervised: Object.freeze({ id: 'supervised', label: 'Modo supervisado', description: 'El niño realiza la actividad con acompañamiento.', showProfessionalControls: false, alwaysShowHelp: false, allowSkip: false, allowEarlyFinish: false, allowRoundRestart: false, explicitFeedback: false }),
  autonomous: Object.freeze({ id: 'autonomous', label: 'Modo autónomo', description: 'La actividad guía al niño paso a paso.', showProfessionalControls: false, alwaysShowHelp: true, allowSkip: false, allowEarlyFinish: false, allowRoundRestart: false, explicitFeedback: true })
});

const base = (activityId, rounds, syllableCounts, complexities, frequencies, activityOptions = {}, targetPositions = []) => ({
  activityId, mode: DEFAULT_SESSION_MODE, rounds, presetId: 'custom',
  linguistic: { syllableCounts, complexities, frequencies, targetPositions }, activityOptions
});

export const SESSION_PRESETS = Object.freeze({
  'order-syllables': {
    initial: base('order-syllables', 5, [2], ['simple'], [1], { variants: ['order', 'missing', 'intruder'], distractorCount: 2, targetPositions: ['initial', 'final'], memorySeconds: 5 }),
    intermediate: base('order-syllables', 10, [2, 3], ['simple', 'mixed'], [1, 2], { variants: ['order', 'missing', 'intruder', 'correctOrder', 'memory'], distractorCount: 3, targetPositions: ['initial', 'medial', 'final'], memorySeconds: 5 }),
    advanced: base('order-syllables', 10, [3, 4], ['mixed', 'trabadas'], [2, 3], { variants: ['order', 'missing', 'intruder', 'correctOrder', 'memory'], distractorCount: 4, targetPositions: ['initial', 'medial', 'final'], memorySeconds: 2 })
  },
  'manipulate-syllables': {
    initial: base('manipulate-syllables', 5, [2], ['simple'], [1], { operations: ['remove', 'add'], variants: ['instruction', 'target', 'identify'], operationVisible: true, chainSteps: 2 }, ['initial', 'final']),
    intermediate: base('manipulate-syllables', 10, [2, 3], ['simple', 'mixed'], [1, 2], { operations: ['remove', 'add', 'replace'], variants: ['instruction', 'target', 'identify', 'error', 'chain'], operationVisible: true, chainSteps: 2 }, ['initial', 'medial', 'final']),
    advanced: base('manipulate-syllables', 10, [3, 4], ['mixed', 'trabadas'], [2, 3], { operations: ['remove', 'add', 'replace', 'invert'], variants: ['instruction', 'target', 'identify', 'error', 'chain'], operationVisible: false, chainSteps: 2 }, ['initial', 'medial', 'final'])
  }
});

const allowed = { complexities: ['simple', 'mixed', 'trabadas'], frequencies: [1, 2, 3], targetPositions: ['initial', 'medial', 'final'], operations: ['remove', 'add', 'replace', 'invert'], orderVariants: ['order', 'missing', 'intruder', 'correctOrder', 'memory'], manipVariants: ['instruction', 'target', 'identify', 'error', 'chain'] };
const uniqueSorted = (values, order) => [...new Set(Array.isArray(values) ? values : [])].filter(value => order.includes(value)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
const clone = value => structuredClone(value);

export function applyPreset(activityId, presetId) {
  const preset = SESSION_PRESETS[activityId]?.[presetId];
  if (!preset) throw new TypeError(`Perfil no válido: ${activityId}/${presetId}`);
  return { ...clone(preset), presetId };
}

export function createDefaultSessionConfig(activityId) { return applyPreset(activityId, 'initial'); }

export function normalizeSessionConfig(rawConfig = {}) {
  const activityId = ACTIVITY_IDS.includes(rawConfig.activityId) ? rawConfig.activityId : rawConfig.activityId;
  if (rawConfig.level != null && ACTIVITY_IDS.includes(activityId) && !rawConfig.linguistic) return migrateLegacyLevelConfig(activityId, rawConfig.level, rawConfig);
  const fallback = ACTIVITY_IDS.includes(activityId) ? createDefaultSessionConfig(activityId) : base(activityId, 5, [], [], []);
  const linguistic = rawConfig.linguistic ?? {};
  const operations = uniqueSorted(rawConfig.activityOptions?.operations ?? fallback.activityOptions.operations ?? [], allowed.operations);
  const variantOrder = activityId === 'order-syllables' ? allowed.orderVariants : allowed.manipVariants;
  const variants = uniqueSorted(rawConfig.activityOptions?.variants ?? fallback.activityOptions.variants ?? [], variantOrder);
  return {
    activityId,
    mode: SESSION_MODES[rawConfig.mode] ? rawConfig.mode : rawConfig.mode ?? DEFAULT_SESSION_MODE,
    rounds: Number(rawConfig.rounds ?? rawConfig.total ?? fallback.rounds),
    presetId: String(rawConfig.presetId ?? fallback.presetId),
    linguistic: {
      // 4 represents the documented corpus criterion “four or more”.
      syllableCounts: uniqueSorted((linguistic.syllableCounts ?? fallback.linguistic.syllableCounts).map(Number), [2, 3, 4]),
      complexities: uniqueSorted(linguistic.complexities ?? fallback.linguistic.complexities, allowed.complexities),
      frequencies: uniqueSorted((linguistic.frequencies ?? fallback.linguistic.frequencies).map(Number), allowed.frequencies),
      targetPositions: activityId === 'manipulate-syllables' ? uniqueSorted(linguistic.targetPositions ?? fallback.linguistic.targetPositions, allowed.targetPositions) : []
    },
    activityOptions: activityId === 'manipulate-syllables'
      ? { operations, variants, operationVisible: rawConfig.activityOptions?.operationVisible ?? fallback.activityOptions.operationVisible ?? true, chainSteps: 2 }
      : { variants, distractorCount: [2, 3, 4].includes(Number(rawConfig.activityOptions?.distractorCount)) ? Number(rawConfig.activityOptions.distractorCount) : fallback.activityOptions.distractorCount, targetPositions: uniqueSorted(rawConfig.activityOptions?.targetPositions ?? fallback.activityOptions.targetPositions, allowed.targetPositions), memorySeconds: [2, 3, 5].includes(Number(rawConfig.activityOptions?.memorySeconds)) ? Number(rawConfig.activityOptions.memorySeconds) : fallback.activityOptions.memorySeconds }
  };
}

export function validateSessionConfig(config) {
  const errors = [];
  if (!ACTIVITY_IDS.includes(config?.activityId)) errors.push('La actividad no es válida.');
  if (!SESSION_MODES[config?.mode]) errors.push('El modo de uso no es válido.');
  if (!Number.isInteger(config?.rounds) || config.rounds < 1 || config.rounds > 100) errors.push('El número de rondas debe estar entre 1 y 100.');
  for (const key of ['syllableCounts', 'complexities', 'frequencies']) if (!config?.linguistic?.[key]?.length) errors.push(`Selecciona al menos una opción de ${key}.`);
  if (config?.activityId === 'manipulate-syllables') {
    if (!config.linguistic.targetPositions?.length) errors.push('Selecciona al menos una posición objetivo.');
    if (!config.activityOptions?.operations?.length) errors.push('Selecciona al menos una operación.');
  }
  if (!config?.activityOptions?.variants?.length) errors.push('Selecciona al menos un tipo de reto.');
  return { valid: errors.length === 0, errors };
}

// El perfil describe únicamente el contenido pedagógico. La modalidad y la
// duración pertenecen a la sesión y, por tanto, no intervienen en su detección.
const comparable = config => {
  const normalized = normalizeSessionConfig(config);
  return { linguistic: normalized.linguistic, activityOptions: normalized.activityOptions };
};
export function configurationMatchesPreset(config, presetId) {
  if (presetId === 'custom') return false;
  const preset = applyPreset(config.activityId, presetId);
  return JSON.stringify(comparable(config)) === JSON.stringify(comparable(preset));
}
export function detectPreset(config) {
  return Object.keys(SESSION_PRESETS[config.activityId] ?? {}).find(id => configurationMatchesPreset(config, id)) ?? 'custom';
}

// Adaptación transitoria: los niveles 1, 2 y 3 corresponden a los perfiles inicial,
// intermedio y avanzado. El motor recibe desde aquí una única configuración dimensional.
export function migrateLegacyLevelConfig(activityId, level, overrides = {}) {
  const presetId = ({ 1: 'initial', 2: 'intermediate', 3: 'advanced' })[Number(level)] ?? 'initial';
  const config = applyPreset(activityId, presetId);
  if (overrides.total != null || overrides.rounds != null) config.rounds = Number(overrides.rounds ?? overrides.total);
  if (overrides.operations && activityId === 'manipulate-syllables') config.activityOptions.operations = uniqueSorted(overrides.operations, allowed.operations);
  if (overrides.mode && SESSION_MODES[overrides.mode]) config.mode = overrides.mode;
  return config;
}

export function getModePolicy(mode = DEFAULT_SESSION_MODE) { return SESSION_MODES[mode] ?? SESSION_MODES[DEFAULT_SESSION_MODE]; }
