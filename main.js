import { createExerciseRegistry } from './src/core/exerciseRegistry.js';
import { calculateRoundProgress, createOrderSyllablesPlugin } from './src/exercises/orderSyllablesPlugin.js';

const registry = createExerciseRegistry();
const exercise = registry.register(createOrderSyllablesPlugin());
const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll('.screen')];
const refs = { pieces: $('#pieces'), answer: $('#answer'), feedback: $('#feedback'), revealed: $('#revealed-word'), check: $('#check'), next: $('#next'), undo: $('#undo'), clear: $('#clear'), editControls: $('.edit-controls'), emptyBack: $('#empty-back'), progress: $('.progress') };
let session = { level: 1, total: 5, current: 1, round: null };

function show(id) { screens.forEach((screen) => { const active = screen.id === id; screen.classList.toggle('active', active); screen.setAttribute('aria-hidden', String(!active)); }); window.scrollTo(0, 0); }
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
