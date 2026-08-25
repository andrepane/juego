export function createSessionShell({ root, home }) {
  let screens = [];
  const refresh = () => { screens = [...root.querySelectorAll('.screen')]; };
  function show(id) {
    refresh();
    screens.forEach(screen => {
      const active = screen.id === id;
      screen.classList.toggle('active', active);
      screen.setAttribute('aria-hidden', String(!active));
    });
    window.scrollTo(0, 0);
    requestAnimationFrame(() => root.querySelector(`#${id} h1`)?.focus({ preventScroll: true }));
  }
  return { show, home: () => show(home), refresh };
}

export function bindConfirmationDialog(dialog, { cancel, confirm, onConfirm, signal }) {
  cancel.addEventListener('click', () => dialog.close(), { signal });
  confirm.addEventListener('click', () => { dialog.close(); onConfirm(); }, { signal });
  return () => dialog.showModal();
}
