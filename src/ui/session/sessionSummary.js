export function renderCommonMetrics(metrics) {
  const notDone = metrics.endedEarly ? metrics.uncompletedRounds : 0;
  return `<div><strong>${metrics.completedRounds}</strong><span>Completadas</span></div><div><strong>${metrics.skippedRounds}</strong><span>Omitidas</span></div><div><strong>${notDone}</strong><span>No realizadas</span></div><div><strong>${metrics.firstTryCorrect}</strong><span>Al primer intento</span></div><div><strong>${metrics.incorrectAttempts}</strong><span>Intentos incorrectos</span></div>`;
}
