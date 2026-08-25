import { applyPreset, createDefaultSessionConfig, detectPreset, getModePolicy, normalizeSessionConfig, SESSION_MODES, validateSessionConfig } from '../core/sessionConfig.js';
import { calculateAvailability } from '../core/sessionAvailability.js';

const labels = { initial: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado', custom: 'Personalizado', simple: 'Sencillas', mixed: 'Mixtas', trabadas: 'Trabadas', initialPosition: 'Inicial', medial: 'Medial', final: 'Final', remove: 'Quitar', add: 'Añadir', replace: 'Sustituir', invert: 'Invertir' };
const variantLabels = { order: 'Ordenar la palabra', missing: 'Completar la unidad ausente', intruder: 'Encontrar la intrusa', correctOrder: 'Corregir el orden', swap: 'Corregir dos letras intercambiadas', memory: 'Reconstrucción con memoria', instruction: 'Ejecutar la consigna', target: 'Alcanzar un resultado', identify: 'Identificar la operación', error: 'Detectar y corregir el error', chain: 'Transformación encadenada' };
const option = (name, value, label, checked) => `<label class="choice"><input type="checkbox" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
const radio = (name, value, title, description, checked) => `<label class="option"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span><strong>${title}</strong>${description ? `<small>${description}</small>` : ''}</span></label>`;

export function createSessionConfigurator(form, activityId) {
  let config = createDefaultSessionConfig(activityId); let advancedOpen = false; let startError = '';
  function render() {
    const a = config.linguistic; const manip = activityId === 'manipulate-syllables'; const letters = activityId === 'order-letters'; const availability = calculateAvailability(config); const validation = validateSessionConfig(config);
    form.innerHTML = `<fieldset><legend>Modo de uso</legend><div class="option-grid mode-grid">${Object.values(SESSION_MODES).map(mode => radio('mode', mode.id, mode.label, mode.description, config.mode === mode.id)).join('')}</div></fieldset>
      ${config.mode === 'autonomous' ? '<p class="notice" role="status">Este modo requiere que el niño pueda comprender las consignas escritas. El apoyo por audio se añadirá más adelante.</p>' : ''}
      <fieldset class="pedagogical-options"><legend>Perfil pedagógico</legend><p class="field-hint">Son puntos de partida pedagógicos, no niveles diagnósticos.</p><div class="preset-grid">${['initial','intermediate','advanced','custom'].map(id => radio('preset', id, labels[id], '', config.presetId === id)).join('')}</div></fieldset>
      <fieldset><legend>Duración</legend><div class="round-options">${[5,10,20].map(n => radio('rounds', n, String(n), '', config.rounds === n)).join('')}${radio('rounds','custom','Personalizado','',![5,10,20].includes(config.rounds))}</div>${![5,10,20].includes(config.rounds)?`<label>Número de rondas <input name="customRounds" type="number" min="1" max="100" value="${config.rounds}"></label>`:''}</fieldset>
      <section class="profile-summary" aria-live="polite"><strong>Resumen del perfil</strong><p>${summary(config)}</p></section>
      <button class="secondary wide advanced-toggle" type="button" aria-expanded="${advancedOpen}" aria-controls="${activityId}-advanced">${advancedOpen ? 'Ocultar opciones avanzadas' : 'Personalizar'}</button>
      <div id="${activityId}-advanced" class="advanced-panel${advancedOpen ? '' : ' hidden'}">
       ${letters?`<fieldset><legend>Longitud de palabra</legend><div class="choice-grid">${[['3-4','3–4 letras'],['5-6','5–6 letras'],['7-8','7–8 letras'],['9+','9 o más']].map(([v,l])=>option('letterLengths',v,l,config.activityOptions.letterLengths.includes(v))).join('')}</div></fieldset>`:`<fieldset><legend>Número de sílabas</legend><div class="choice-grid">${[[2,'2'],[3,'3'],[4,'4 o más']].map(([v,l])=>option('syllableCounts',v,l,a.syllableCounts.includes(v))).join('')}</div><small>“4 o más” usa únicamente palabras del corpus con al menos cuatro sílabas.</small></fieldset>`}
       <fieldset><legend>Complejidad silábica</legend><div class="choice-grid">${['simple','mixed','trabadas'].map(v=>option('complexities',v,labels[v],a.complexities.includes(v))).join('')}</div></fieldset>
       <fieldset><legend>Frecuencia</legend><div class="choice-grid">${[[1,'Muy frecuente'],[2,'Frecuente'],[3,'Menos frecuente']].map(([v,l])=>option('frequencies',v,l,a.frequencies.includes(v))).join('')}</div></fieldset>
       <fieldset><legend>Tipos de reto</legend><div class="choice-grid">${Object.keys(variantLabels).filter(v => manip ? ['instruction','target','identify','error','chain'].includes(v) : letters ? ['order','missing','intruder','swap','memory'].includes(v) : ['order','missing','intruder','correctOrder','memory'].includes(v)).map(v=>option('variants',v,variantLabels[v],config.activityOptions.variants.includes(v))).join('')}</div></fieldset>
       ${!manip ? `<fieldset><legend>Número de distractores</legend><div class="round-options">${[2,3,4].map(n=>radio('distractorCount',n,String(n),'',config.activityOptions.distractorCount===n)).join('')}</div></fieldset>${letters?'':`<fieldset><legend>Posición objetivo</legend><div class="choice-grid">${[['initial','Inicial'],['medial','Medial'],['final','Final']].map(([v,l])=>option('orderTargetPositions',v,l,config.activityOptions.targetPositions.includes(v))).join('')}</div></fieldset>`}<fieldset><legend>Exposición en memoria</legend><div class="round-options">${[2,3,5].map(n=>radio('memorySeconds',n,`${n} s`,'',config.activityOptions.memorySeconds===n)).join('')}</div></fieldset>` : ''}
       ${manip ? `<fieldset><legend>Alcanzar un resultado</legend>${radio('operationVisible','true','Operación visible','Se indica qué transformación realizar.',config.activityOptions.operationVisible)}${radio('operationVisible','false','Operación oculta','La operación se deduce comparando resultados.',!config.activityOptions.operationVisible)}<small>La transformación encadenada usa exactamente 2 pasos.</small></fieldset>` : ''}
       ${manip ? `<fieldset><legend>Posición objetivo</legend><div class="choice-grid">${[['initial','Inicial'],['medial','Medial'],['final','Final']].map(([v,l])=>option('targetPositions',v,l,a.targetPositions.includes(v))).join('')}</div></fieldset><fieldset><legend>Operaciones</legend><div class="choice-grid">${['remove','add','replace','invert'].map(v=>option('operations',v,labels[v],config.activityOptions.operations.includes(v))).join('')}</div></fieldset>` : ''}
      </div>
      <section class="availability ${availability.sufficient ? 'available' : 'unavailable'}" aria-live="polite"><strong>Palabras compatibles: ${availability.compatibleWordCount}</strong><strong>Retos diferentes disponibles: ${availability.challengeCount}</strong><dl class="operation-availability">${config.activityOptions.variants.map(variant => `<div><dt>${variantLabels[variant]}</dt><dd>${availability.availableByVariant[variant] ?? 0} disponibles · ${availability.neededByVariant[variant] ?? 0} necesarios</dd></div>`).join('')}</dl>${manip ? `<dl class="operation-availability">${config.activityOptions.operations.map(operation => `<div><dt>${labels[operation]}</dt><dd>${availability.availableByOperation[operation] ?? 0} disponibles · ${availability.neededByOperation[operation] ?? 0} necesarios</dd></div>`).join('')}</dl>` : ''}${availability.reason ? `<p>${availability.reason}</p><ul>${availability.suggestions.map(s=>`<li>${s}</li>`).join('')}</ul>` : ''}</section>
      <p class="feedback error config-errors" role="alert">${[...validation.errors, startError].filter(Boolean).join(' ')}</p><button class="primary wide" type="submit"${!availability.sufficient || !validation.valid ? ' disabled' : ''}>Comenzar</button>`;
  }
  function read() {
    const data = new FormData(form); const values = name => data.getAll(name);
    return normalizeSessionConfig({ activityId, mode: data.get('mode'), rounds: data.get('rounds')==='custom'?Number(data.get('customRounds')??config.rounds):Number(data.get('rounds')), presetId: config.presetId,
      linguistic: { syllableCounts: values('syllableCounts').map(Number), complexities: values('complexities'), frequencies: values('frequencies').map(Number), targetPositions: values('targetPositions') },
      activityOptions: { operations: values('operations'), variants: values('variants'), distractorCount: Number(data.get('distractorCount')), targetPositions: values('orderTargetPositions'), memorySeconds: Number(data.get('memorySeconds')), letterLengths: values('letterLengths'), operationVisible: data.get('operationVisible') !== 'false', chainSteps: 2 } });
  }
  form.addEventListener('change', event => {
    if (event.target.name === 'preset') { if (event.target.value === 'custom') { config.presetId = 'custom'; advancedOpen = true; } else { const mode = config.mode; config = applyPreset(activityId, event.target.value); config.mode = mode; advancedOpen = false; } }
    else { config = read(); config.presetId = detectPreset(config); startError = ''; if (event.target.name !== 'mode' && event.target.name !== 'rounds') advancedOpen = true; }
    render();
  });
  form.addEventListener('click', event => { if (event.target.closest('.advanced-toggle')) { advancedOpen = !advancedOpen; render(); } });
  render();
  return { getConfig: () => normalizeSessionConfig(config), getPolicy: () => getModePolicy(config.mode), setStartError: message => { startError = message; render(); }, restore: presetId => { config = applyPreset(activityId, presetId); render(); } };
}

function summary(config) {
  const a = config.linguistic; const lengths = a.syllableCounts.map(n => n === 4 ? '4 o más' : n).join(', ');
  const frequencyLabels = { 1: 'Muy frecuente', 2: 'Frecuente', 3: 'Menos frecuente' }; const positionLabels = { initial: 'inicial', medial: 'medial', final: 'final' };
  const parts = [`${config.rounds} rondas`, config.activityId==='order-letters'?`${config.activityOptions.letterLengths.join(', ')} letras`:`${lengths} sílabas`, a.complexities.map(v=>labels[v]).join(', '), a.frequencies.map(v=>frequencyLabels[v]).join(', ')];
  if (config.activityId === 'manipulate-syllables') parts.push(a.targetPositions.map(v=>positionLabels[v]).join(', '), config.activityOptions.operations.map(v=>labels[v]).join(', '));
  return parts.join(' · ');
}
