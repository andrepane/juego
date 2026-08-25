export function calculateSessionProgress(current, total) {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(current / total * 100)));
}

export function updateSessionProgress(element, fill, current, total) {
  const value = calculateSessionProgress(current, total);
  fill.style.width = `${value}%`;
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', '100');
  element.setAttribute('aria-valuenow', String(value));
  element.setAttribute('aria-valuetext', `Ronda ${current} de ${total}`);
  return value;
}
