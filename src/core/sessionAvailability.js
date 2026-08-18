import { getAllWords, wordMatchesLinguistic } from './wordUtils.js';
import { isOrderableWord } from '../exercises/orderSyllablesPlugin.js';
import { buildChallengePool, planBalancedChallenges } from '../exercises/manipulateSyllablesPlugin.js';

export function compatibleWords(config, words = getAllWords()) {
  return words.filter(word => wordMatchesLinguistic(word, config.linguistic));
}
export function calculateAvailability(config, words = getAllWords()) {
  const candidates = compatibleWords(config, words);
  if (config.activityId === 'order-syllables') {
    const playable = candidates.filter(isOrderableWord);
    return availabilityResult(config, playable.length, playable.length, {}, {}, playable.length >= config.rounds);
  }
  const challenges = buildChallengePool({ config, getWords: () => candidates });
  const plan = planBalancedChallenges(challenges, config.activityOptions.operations, config.rounds, () => 0);
  return availabilityResult(config, new Set(challenges.map(item => item.baseWord)).size, challenges.length, plan.availableByOperation, plan.neededByOperation, plan.status === 'ready');
}
function availabilityResult(config, compatibleWordCount, challengeCount, availableByOperation, neededByOperation, sufficient) {
  const suggestions = [];
  const deficits = Object.keys(neededByOperation).filter(operation => (availableByOperation[operation] ?? 0) < neededByOperation[operation]);
  if (deficits.length) suggestions.push(`Amplía los filtros o elimina ${deficits.map(operation => operationLabel(operation)).join(' y ')} de las operaciones seleccionadas.`);
  else if (!sufficient && challengeCount < config.rounds) suggestions.push('Amplía el número de sílabas, la complejidad o la frecuencia para obtener más retos únicos.');
  const reason = challengeCount === 0 ? 'Los filtros seleccionados no generan ningún reto.' : deficits.length
    ? `No hay suficientes retos de ${deficits.map(operation => operationLabel(operation)).join(' y ')} para la distribución equilibrada.`
    : !sufficient ? `Solo hay ${challengeCount} retos diferentes para ${config.rounds} rondas.` : '';
  return { compatibleWordCount, challengeCount, availableByOperation, neededByOperation, sufficient, constructible: sufficient, reason, suggestions };
}
function operationLabel(operation) { return ({ remove: 'quitar', add: 'añadir', replace: 'sustituir', invert: 'invertir' })[operation] ?? operation; }
