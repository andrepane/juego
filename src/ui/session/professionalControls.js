export function renderProfessionalControls(container, plugin, policy, handlers) {
  container.classList.toggle('hidden', !policy.showProfessionalControls);
  if (!policy.showProfessionalControls) { container.replaceChildren(); return; }
  container.innerHTML = `<strong>Controles profesionales</strong>${typeof plugin.restartRound === 'function' ? '<button class="secondary" data-prof="restart" type="button">Reiniciar reto</button>' : ''}${policy.allowSkip && typeof plugin.skipRound === 'function' ? '<button class="secondary" data-prof="skip" type="button">Omitir</button>' : ''}<button class="secondary" data-prof="help" type="button">Mostrar u ocultar ayuda</button>${policy.allowEarlyFinish && typeof plugin.finishSession === 'function' ? '<button class="secondary danger" data-prof="finish" type="button">Finalizar sesión</button>' : ''}`;
  container.onclick = event => {
    const action = event.target.closest('[data-prof]')?.dataset.prof;
    if (action) handlers[action]?.();
  };
}

export function clearProfessionalControls(container) {
  if (container) container.onclick = null;
}
