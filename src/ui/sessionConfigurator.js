import { applyPreset, createDefaultSessionConfig, detectPreset, getModePolicy, normalizeSessionConfig, SESSION_MODES, validateSessionConfig } from '../core/sessionConfig.js';
import { calculateAvailability } from '../core/sessionAvailability.js';

const labels = { initial: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado', custom: 'Personalizado', simple: 'Sencillas', mixed: 'Mixtas', trabadas: 'Trabadas', initialPosition: 'Inicial', medial: 'Medial', final: 'Final', remove: 'Quitar', add: 'Añadir', replace: 'Sustituir', invert: 'Invertir' };
const option = (name, value, label, checked) => `<label class="choice"><input type="checkbox" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
const radio = (name, value, title, description, checked) => `<label class="option"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span><strong>${title}</strong>${description ? `<small>${description}</small>` : ''}</span></label>`;

export function createSessionConfigurator(form, activityId) {
  let config = createDefaultSessionConfig(activityId); let advancedOpen = false;
  function render() {
    const a = config.linguistic; const manip = activityId === 'manipulate-syllables'; const availability = calculateAvailability(config); const validation = validateSessionConfig(config);
    form.innerHTML = `<fieldset><legend>Modo de uso</legend><div class="option-grid mode-grid">${Object.values(SESSION_MODES).map(mode => radio('mode', mode.id, mode.label, mode.description, config.mode === mode.id)).join('')}</div></fieldset>
      ${config.mode === 'autonomous' ? '<p class="notice" role="status">Este modo requiere que el niño pueda comprender las consignas escritas. El apoyo por audio se añadirá más adelante.</p>' : ''}
      <fieldset><legend>Perfil rápido</legend><p class="field-hint">Son puntos de partida pedagógicos, no niveles diagnósticos.</p><div class="preset-grid">${['initial','intermediate','advanced','custom'].map(id => radio('preset', id, labels[id], '', config.presetId === id)).join('')}</div></fieldset>
      <fieldset><legend>Duración</legend><div class="round-options">${[5,10,15,20].map(n => radio('rounds', n, String(n), '', config.rounds === n)).join('')}</div></fieldset>
      <section class="profile-summary" aria-live="polite"><strong>Resumen del perfil</strong><p>${summary(config)}</p></section>
      <button class="secondary wide advanced-toggle" type="button" aria-expanded="${advancedOpen}" aria-controls="${activityId}-advanced">${advancedOpen ? 'Ocultar opciones avanzadas' : 'Personalizar'}</button>
      <div id="${activityId}-advanced" class="advanced-panel${advancedOpen ? '' : ' hidden'}">
       <fieldset><legend>Número de sílabas</legend><div class="choice-grid">${[[2,'2'],[3,'3'],[4,'4 o más']].map(([v,l])=>option('syllableCounts',v,l,a.syllableCounts.includes(v))).join('')}</div><small>“4 o más” usa únicamente palabras del corpus con al menos cuatro sílabas.</small></fieldset>
       <fieldset><legend>Complejidad silábica</legend><div class="choice-grid">${['simple','mixed','trabadas'].map(v=>option('complexities',v,labels[v],a.complexities.includes(v))).join('')}</div></fieldset>
       <fieldset><legend>Frecuencia</legend><div class="choice-grid">${[[1,'Muy frecuente'],[2,'Frecuente'],[3,'Menos frecuente']].map(([v,l])=>option('frequencies',v,l,a.frequencies.includes(v))).join('')}</div></fieldset>
       ${manip ? `<fieldset><legend>Posición objetivo</legend><div class="choice-grid">${[['initial','Inicial'],['medial','Medial'],['final','Final']].map(([v,l])=>option('targetPositions',v,l,a.targetPositions.includes(v))).join('')}</div></fieldset><fieldset><legend>Operaciones</legend><div class="choice-grid">${['remove','add','replace','invert'].map(v=>option('operations',v,labels[v],config.activityOptions.operations.includes(v))).join('')}</div></fieldset>` : ''}
      </div>
      <section class="availability ${availability.sufficient ? 'available' : 'unavailable'}" aria-live="polite"><strong>Palabras compatibles: ${availability.compatibleWordCount}</strong><strong>Retos diferentes disponibles: ${availability.challengeCount}</strong>${availability.reason ? `<p>${availability.reason}</p><ul>${availability.suggestions.map(s=>`<li>${s}</li>`).join('')}</ul>` : ''}</section>
      <p class="feedback error config-errors" role="alert">${validation.errors.join(' ')}</p><button class="primary wide" type="submit"${!availability.sufficient || !validation.valid ? ' disabled' : ''}>Comenzar</button>`;
  }
  function read() {
    const data = new FormData(form); const values = name => data.getAll(name);
    return normalizeSessionConfig({ activityId, mode: data.get('mode'), rounds: Number(data.get('rounds')), presetId: config.presetId,
      linguistic: { syllableCounts: values('syllableCounts').map(Number), complexities: values('complexities'), frequencies: values('frequencies').map(Number), targetPositions: values('targetPositions') },
      activityOptions: { operations: values('operations') } });
  }
  form.addEventListener('change', event => {
    if (event.target.name === 'preset') { if (event.target.value === 'custom') { config.presetId = 'custom'; advancedOpen = true; } else { const mode = config.mode; config = applyPreset(activityId, event.target.value); config.mode = mode; advancedOpen = false; } }
    else { config = read(); config.presetId = detectPreset(config); if (event.target.name !== 'mode' && event.target.name !== 'rounds') advancedOpen = true; }
    render();
  });
  form.addEventListener('click', event => { if (event.target.closest('.advanced-toggle')) { advancedOpen = !advancedOpen; if (advancedOpen) config.presetId = 'custom'; render(); } });
  render();
  return { getConfig: () => normalizeSessionConfig(config), getPolicy: () => getModePolicy(config.mode), restore: presetId => { config = applyPreset(activityId, presetId); render(); } };
}

function summary(config) {
  const a = config.linguistic; const lengths = a.syllableCounts.map(n => n === 4 ? '4 o más' : n).join(', ');
  const parts = [`${config.rounds} rondas`, `${lengths} sílabas`, a.complexities.map(v=>labels[v]).join(', '), `frecuencias ${a.frequencies.join(', ')}`];
  if (config.activityId === 'manipulate-syllables') parts.push(a.targetPositions.map(v=>v === 'initial' ? 'inicial' : v).join(', '), config.activityOptions.operations.map(v=>labels[v]).join(', '));
  return parts.join(' · ');
}
