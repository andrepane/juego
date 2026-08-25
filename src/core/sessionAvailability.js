import { getAllWords, wordMatchesLinguistic } from './wordUtils.js';
import { isOrderableWord } from '../exercises/orderSyllablesPlugin.js';
import { buildOrderChallengePool } from '../exercises/orderSyllablesVariants.js';
import { planBalancedVariants } from './challengePlanner.js';
import { buildChallengePool, buildManipulationVariantPool, planBalancedChallenges } from '../exercises/manipulateSyllablesPlugin.js';
import { buildOrderLettersChallengePool } from '../exercises/orderLettersPlugin.js';
import { getOrthographicLength } from './wordUtils.js';

export function compatibleWords(config, words = getAllWords()) {
  return words.filter(word => wordMatchesLinguistic(word, config.linguistic));
}
export function calculateAvailability(config, words = getAllWords()) {
  const candidates = compatibleWords(config, words);
  if (config.activityId === 'order-letters') {
    const band=n=>n<=4?'3-4':n<=6?'5-6':n<=8?'7-8':'9+';
    const playable=candidates.filter(word=>config.activityOptions.letterLengths.includes(band(getOrthographicLength(word))));
    const challenges=buildOrderLettersChallengePool(playable,config.activityOptions,()=>0.37);
    const plan=planBalancedVariants(challenges,config.activityOptions.variants,config.rounds,()=>0.37);
    return availabilityResult(config,new Set(challenges.map(x=>x.baseWord)).size,challenges.length,{}, {},plan.status==='ready',plan.availableByVariant,plan.neededByVariant);
  }
  if (config.activityId === 'order-syllables') {
    const playable = candidates.filter(isOrderableWord); const challenges = buildOrderChallengePool(playable, config.activityOptions, () => 0.37);
    const plan = planBalancedVariants(challenges, config.activityOptions.variants, config.rounds, () => 0.37);
    return availabilityResult(config, new Set(challenges.map(item => item.baseWord)).size, challenges.length, {}, {}, plan.status === 'ready', plan.availableByVariant, plan.neededByVariant);
  }
  const challenges = buildChallengePool({ config, getWords: () => candidates });
  const plan = planBalancedChallenges(challenges, config.activityOptions.operations, config.rounds, () => 0);
  const variantPool = buildManipulationVariantPool(challenges, config.activityOptions.variants, config.activityOptions).map(item => ({ ...item, variant: item.challengeVariant }));
  const variantPlan = planBalancedVariants(variantPool, config.activityOptions.variants, config.rounds, () => 0.37);
  return availabilityResult(config, new Set(challenges.map(item => item.baseWord)).size, variantPool.length, plan.availableByOperation, plan.neededByOperation, plan.status === 'ready' && variantPlan.status === 'ready', variantPlan.availableByVariant, variantPlan.neededByVariant);
}
function availabilityResult(config, compatibleWordCount, challengeCount, availableByOperation, neededByOperation, sufficient, availableByVariant = {}, neededByVariant = {}) {
  const suggestions = [];
  const deficits = Object.keys(neededByOperation).filter(operation => (availableByOperation[operation] ?? 0) < neededByOperation[operation]);
  if (deficits.length) suggestions.push(`Amplía los filtros o elimina ${deficits.map(operation => operationLabel(operation)).join(' y ')} de las operaciones seleccionadas.`);
  else if (!sufficient && challengeCount < config.rounds) suggestions.push('Amplía el número de sílabas, la complejidad o la frecuencia para obtener más retos únicos.');
  const reason = challengeCount === 0 ? 'Los filtros seleccionados no generan ningún reto.' : deficits.length
    ? `No hay suficientes retos de ${deficits.map(operation => operationLabel(operation)).join(' y ')} para la distribución equilibrada.`
    : !sufficient ? `Solo hay ${challengeCount} retos diferentes para ${config.rounds} rondas.` : '';
  return { compatibleWordCount, challengeCount, availableByOperation, neededByOperation, availableByVariant, neededByVariant, sufficient, constructible: sufficient, reason, suggestions };
}
function operationLabel(operation) { return ({ remove: 'quitar', add: 'añadir', replace: 'sustituir', invert: 'invertir' })[operation] ?? operation; }
