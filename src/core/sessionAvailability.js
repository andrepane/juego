import { getAllWords, wordMatchesLinguistic } from './wordUtils.js';
import { isOrderableWord } from '../exercises/orderSyllablesPlugin.js';
import { buildChallengePool } from '../exercises/manipulateSyllablesPlugin.js';

export function compatibleWords(config, words = getAllWords()) {
  return words.filter(word => wordMatchesLinguistic(word, config.linguistic));
}
export function calculateAvailability(config, words = getAllWords()) {
  const candidates = compatibleWords(config, words);
  if (config.activityId === 'order-syllables') {
    const playable = candidates.filter(isOrderableWord);
    return availabilityResult(config, playable.length, playable.length);
  }
  const challenges = buildChallengePool({ config, getWords: () => candidates });
  return availabilityResult(config, new Set(challenges.map(item => item.baseWord)).size, challenges.length);
}
function availabilityResult(config, compatibleWordCount, challengeCount) {
  const sufficient = challengeCount >= config.rounds;
  const suggestions = [];
  if (!config.linguistic.syllableCounts.includes(2) || !config.linguistic.syllableCounts.includes(3)) suggestions.push('Añade otra longitud.');
  if (config.linguistic.frequencies.length < 3) suggestions.push('Permite otra frecuencia.');
  if (config.activityId === 'manipulate-syllables' && config.linguistic.targetPositions.length < 3) suggestions.push('Elige más posiciones.');
  if (config.activityId === 'manipulate-syllables' && config.activityOptions.operations.length < 4) suggestions.push('Elige más operaciones.');
  const reason = challengeCount === 0 ? 'La combinación de longitud, complejidad, frecuencia, posición y operaciones no genera ningún reto.' : !sufficient ? `Solo hay ${challengeCount} retos diferentes para ${config.rounds} rondas.` : '';
  return { compatibleWordCount, challengeCount, sufficient, reason, suggestions };
}
