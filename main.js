import { createExerciseRegistry } from './src/core/exerciseRegistry.js';
import { calculateRoundProgress, createOrderSyllablesPlugin } from './src/exercises/orderSyllablesPlugin.js';
import { createManipulateSyllablesPlugin } from './src/exercises/manipulateSyllablesPlugin.js';
import { MANIPULATION_OPERATIONS } from './src/exercises/manipulateSyllablesConfig.js';

const registry = createExerciseRegistry();
const exercise = registry.register(createOrderSyllablesPlugin());
const manipulation = registry.register(createManipulateSyllablesPlugin());
const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll('.screen')];
const refs = { pieces: $('#pieces'), answer: $('#answer'), feedback: $('#feedback'), revealed: $('#revealed-word'), check: $('#check'), next: $('#next'), undo: $('#undo'), clear: $('#clear'), editControls: $('.edit-controls'), emptyBack: $('#empty-back'), progress: $('.progress') };
let session = { level: 1, total: 5, current: 1, round: null };

function show(id) { screens.forEach((screen) => { const active = screen.id === id; screen.classList.toggle('active', active); screen.setAttribute('aria-hidden', String(!active)); }); window.scrollTo(0, 0); requestAnimationFrame(() => document.querySelector(`#${id} h1`)?.focus({ preventScroll: true })); }
function renderRound(result) {
  if (!result || result.status === 'empty' || !Array.isArray(result.pieces) || !Array.isArray(result.answer)) {
    renderEmptyState();
    return;
  }
  session.round = result;
  $('#round-label').textContent = `Ronda ${session.current} de ${session.total}`;
  $('#score-label').textContent = `Al primer intento: ${exercise.getMetrics().firstTryCorrect}`;
  const progress = calculateRoundProgress(session.current, session.total);
  $('#progress-bar').style.width = `${progress}%`;
  refs.progress.setAttribute('aria-valuemin', '0');
  refs.progress.setAttribute('aria-valuemax', '100');
  refs.progress.setAttribute('aria-valuenow', String(progress));
  refs.progress.setAttribute('aria-valuetext', `Ronda ${session.current} de ${session.total}`);
  refs.pieces.innerHTML = result.pieces.map((piece) => `<button class="piece" type="button" data-piece="${piece.id}">${piece.text}</button>`).join('');
  renderAnswer(result.answer); refs.feedback.textContent = 'Elige una sílaba para empezar.'; refs.feedback.className = 'feedback'; refs.revealed.textContent = '';
  refs.check.classList.remove('hidden'); refs.next.classList.add('hidden'); refs.editControls.classList.remove('hidden'); refs.emptyBack.classList.add('hidden'); updateControls(result);
}
function renderEmptyState() {
  session.round = null;
  refs.pieces.innerHTML = '';
  renderAnswer([]);
  refs.feedback.textContent = 'No hay suficientes palabras disponibles para esta configuración';
  refs.feedback.className = 'feedback error';
  refs.revealed.textContent = '';
  refs.check.classList.add('hidden');
  refs.next.classList.add('hidden');
  refs.editControls.classList.add('hidden');
  refs.emptyBack.classList.remove('hidden');
}
function renderAnswer(answer) { refs.answer.innerHTML = answer.length ? answer.map((piece) => `<span class="answer-piece">${piece.text}</span>`).join('') : '<span class="placeholder">Aquí aparecerá tu respuesta</span>'; }
function updateControls(result) { const used = new Set(result.answer.map((piece) => piece.id)); refs.pieces.querySelectorAll('[data-piece]').forEach((button) => { button.disabled = used.has(button.dataset.piece) || result.status === 'correct'; }); refs.undo.disabled = !result.answer.length || result.status === 'correct'; refs.clear.disabled = !result.answer.length || result.status === 'correct'; refs.check.disabled = result.answer.length !== result.expectedLength || ['correct', 'incorrect', 'locked'].includes(result.status); }
function apply(result) {
  session.round = result; renderAnswer(result.answer); updateControls(result);
  if (result.status === 'incorrect') { refs.feedback.textContent = 'El orden no es correcto. Inténtalo de nuevo'; refs.feedback.className = 'feedback error'; }
  if (result.status === 'correct') { refs.feedback.textContent = '¡Muy bien! Has formado la palabra.'; refs.feedback.className = 'feedback success'; refs.revealed.textContent = result.word; refs.check.classList.add('hidden'); refs.next.classList.remove('hidden'); $('#score-label').textContent = `Al primer intento: ${exercise.getMetrics().firstTryCorrect}`; }
}
$('#open-config').addEventListener('click', () => show('config'));
$('#open-manip-config').addEventListener('click', () => show('manip-config'));
document.querySelectorAll('[data-home]').forEach((button) => button.addEventListener('click', () => show('home')));
$('#config-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); session = { level: Number(data.get('level')), total: Number(data.get('rounds')), current: 1, round: null }; show('game'); renderRound(exercise.start({ level: session.level, resetScore: true })); });
refs.pieces.addEventListener('click', (event) => { const button = event.target.closest('[data-piece]'); if (button) apply(exercise.submit({ type: 'tap', pieceId: button.dataset.piece })); });
refs.undo.addEventListener('click', () => apply(exercise.submit({ type: 'undo' })));
refs.clear.addEventListener('click', () => apply(exercise.submit({ type: 'clear' })));
refs.check.addEventListener('click', () => apply(exercise.submit({ type: 'validate' })));
refs.next.addEventListener('click', () => { if (session.current >= session.total) { renderSummary(); show('summary'); return; } session.current += 1; renderRound(exercise.next()); });
refs.emptyBack.addEventListener('click', () => show('config'));
function renderSummary() { const m = exercise.getMetrics(); $('#metrics').innerHTML = `<div><strong>${m.roundsPlayed}</strong><span>Rondas realizadas</span></div><div><strong>${m.firstTryCorrect}</strong><span>Al primer intento</span></div><div><strong>${m.incorrectAttempts}</strong><span>Intentos incorrectos</span></div><div><strong>${m.firstTryPercentage}%</strong><span>Acierto al primer intento</span></div>`; $('#word-results').innerHTML = m.results.map((item) => `<li><strong>${item.word}</strong><span>${item.firstTry ? '✓ Al primer intento' : '↻ Necesitó varios intentos'}</span></li>`).join(''); }
$('#repeat').addEventListener('click', () => show('config'));
const dialog = $('#exit-dialog'); $('#exit').addEventListener('click', () => dialog.showModal()); $('#cancel-exit').addEventListener('click', () => dialog.close()); $('#confirm-exit').addEventListener('click', () => { dialog.close(); show('home'); });
show('home');

const manip = { result: null };
const manipRefs = { workspace: $('#manip-workspace'), extraZone: $('#manip-extra-zone'), extra: $('#manip-extra'), extraLabel: $('#manip-extra-label'), helper: $('#manip-helper'), announcement: $('#manip-announcement'), feedback: $('#manip-feedback'), check: $('#manip-check'), next: $('#manip-next'), undo: $('#manip-undo'), reset: $('#manip-reset') };
const operationLabels = Object.fromEntries(Object.values(MANIPULATION_OPERATIONS).map((item) => [item.id, item.label]));
const pieceButton = (piece, action, selected, disabled) => `<button class="piece manip-piece${selected ? ' selected' : ''}" type="button" data-action="${action}" data-piece="${piece.id}"${action.includes('select') ? ` aria-pressed="${selected}"` : ''}${disabled ? ' disabled' : ''}>${piece.text}${selected ? '<span class="selection-mark" aria-hidden="true">✓</span>' : ''}</button>`;
function insertionLabel(index, pieces) { if (index === 0) return 'Insertar al principio'; if (index === pieces.length) return 'Insertar al final'; return `Insertar después de ${pieces[index - 1].text.toLocaleUpperCase('es')}`; }
function renderManipWorkspace(result) {
  const selected = result.selectedPieceId;
  if (result.operation === 'add' && result.extraAvailable) {
    manipRefs.workspace.innerHTML = result.currentPieces.map((piece, index) => `<button class="insert-slot" type="button" data-action="insert-at" data-slot="${index}" aria-label="${insertionLabel(index, result.currentPieces)}"${selected ? '' : ' disabled'}>+</button>${pieceButton(piece, 'none', false, true)}`).join('') + `<button class="insert-slot" type="button" data-action="insert-at" data-slot="${result.currentPieces.length}" aria-label="${insertionLabel(result.currentPieces.length, result.currentPieces)}"${selected ? '' : ' disabled'}>+</button>`;
    return;
  }
  const action = result.operation === 'remove' ? 'remove-piece' : result.operation === 'replace' ? 'replace-piece' : result.operation === 'invert' ? 'select-swap-piece' : 'none';
  const locked = result.roundCompleted || (result.operation === 'remove' && result.historyLength > 0) || (result.operation === 'replace' && !selected);
  manipRefs.workspace.innerHTML = result.currentPieces.map((piece) => pieceButton(piece, action, selected === piece.id, locked || action === 'none')).join('');
}
function updateManip(result) {
  manip.result = result; renderManipWorkspace(result);
  const hasExtra = ['add', 'replace'].includes(result.operation); manipRefs.extraZone.classList.toggle('hidden', !hasExtra); manipRefs.extraLabel.textContent = result.operation === 'add' ? 'Ficha para añadir' : 'Ficha nueva';
  manipRefs.extra.innerHTML = hasExtra && result.extraAvailable ? pieceButton(result.extraPiece, 'select-extra', result.selectedPieceId === result.extraPiece.id, result.roundCompleted) : '';
  manipRefs.undo.disabled = !result.historyLength || result.roundCompleted; manipRefs.reset.disabled = result.roundCompleted; manipRefs.check.disabled = !result.canValidate; manipRefs.announcement.textContent = result.announcement;
  if (!['incorrect', 'correct'].includes(result.status)) { manipRefs.feedback.textContent = result.helperInstruction; manipRefs.feedback.className = 'feedback'; }
  if (result.status === 'incorrect') { manipRefs.feedback.textContent = 'El resultado no es correcto. Revisa la consigna e inténtalo de nuevo.'; manipRefs.feedback.className = 'feedback error'; }
  if (result.status === 'correct') { manipRefs.feedback.textContent = `¡Muy bien! Resultado correcto: ${result.lexicalStatus === 'real' ? 'palabra real' : 'palabra inventada'}.`; manipRefs.feedback.className = 'feedback success'; $('#manip-revealed').textContent = result.expectedText; manipRefs.check.classList.add('hidden'); manipRefs.next.classList.remove('hidden'); $('#manip-score-label').textContent = `Al primer intento: ${manipulation.getMetrics().firstTryCorrect}`; }
}
function renderManipRound(result) {
  if (result.status === 'insufficient') { $('#manip-config-error').textContent = `Solo hay ${result.available} retos diferentes disponibles; has solicitado ${result.requested}. Reduce las rondas o selecciona más operaciones.`; show('manip-config'); return; }
  manip.result = result; $('#manip-round-label').textContent = `Ronda ${result.round} de ${result.total}`; $('#manip-operation').textContent = `Operación: ${operationLabels[result.operation]}`;
  $('#manip-base').textContent = result.baseWord; $('#manip-original').textContent = result.original.join(' · '); $('#manip-instruction').textContent = result.instruction; manipRefs.helper.textContent = result.helperInstruction;
  const progress = calculateRoundProgress(result.round, result.total); $('#manip-progress-bar').style.width = `${progress}%`; const bar = $('#manip-progress'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', progress); bar.setAttribute('aria-valuetext', `Ronda ${result.round} de ${result.total}`);
  $('#manip-revealed').textContent = ''; manipRefs.check.classList.remove('hidden'); manipRefs.next.classList.add('hidden'); updateManip(result);
}
$('#manip-config-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const operations = data.getAll('operations'); if (!operations.length) { $('#manip-config-error').textContent = 'Selecciona al menos una operación para comenzar.'; return; } $('#manip-config-error').textContent = ''; const result = manipulation.start({ level: Number(data.get('level')), total: Number(data.get('rounds')), operations }); if (result.status !== 'insufficient') show('manip-game'); renderManipRound(result); });
function handleManipAction(event) { const button = event.target.closest('[data-action]'); if (!button || button.dataset.action === 'none') return; const action = { type: button.dataset.action }; if (button.dataset.piece) action.pieceId = button.dataset.piece; if (button.dataset.slot !== undefined) action.slotIndex = Number(button.dataset.slot); const result = manipulation.submit(action); updateManip(result); requestAnimationFrame(() => { const selected = document.querySelector(`[data-piece="${result.selectedPieceId}"]`); (selected || (result.canValidate ? manipRefs.check : manipRefs.workspace.querySelector('button:not(:disabled)')) || manipRefs.undo).focus(); }); }
manipRefs.workspace.addEventListener('click', handleManipAction); manipRefs.extra.addEventListener('click', handleManipAction);
manipRefs.undo.addEventListener('click', () => updateManip(manipulation.submit({ type: 'undo' }))); manipRefs.reset.addEventListener('click', () => updateManip(manipulation.submit({ type: 'reset' }))); manipRefs.check.addEventListener('click', () => updateManip(manipulation.submit({ type: 'validate' })));
manipRefs.next.addEventListener('click', () => { const result = manipulation.next(); if (result.status === 'complete') { renderManipSummary(); show('manip-summary'); } else renderManipRound(result); });
function renderManipSummary() { const m = manipulation.getMetrics(); $('#manip-metrics').innerHTML = `<div><strong>${m.roundsPlayed}</strong><span>Rondas realizadas</span></div><div><strong>${m.firstTryCorrect}</strong><span>Al primer intento</span></div><div><strong>${m.incorrectAttempts}</strong><span>Intentos incorrectos</span></div><div><strong>${m.firstTryPercentage}%</strong><span>Acierto al primer intento</span></div>`; $('#manip-groups').innerHTML = Object.entries(m.byOperation).map(([key, value]) => `<div><strong>${operationLabels[key]}</strong><br>${value.firstTryCorrect}/${value.rounds} al primer intento</div>`).join(''); $('#manip-results').innerHTML = m.results.map((item) => `<li><span><strong>${item.baseWord}</strong><br>${item.instruction}<br>Resultado: ${item.expected}</span><span>${item.firstTry ? '✓ Primer intento' : '↻ Varios intentos'}</span></li>`).join(''); }
$('#manip-repeat').addEventListener('click', () => show('manip-config')); $('#manip-empty-back').addEventListener('click', () => show('manip-config')); $('#manip-exit').addEventListener('click', () => dialog.showModal());
