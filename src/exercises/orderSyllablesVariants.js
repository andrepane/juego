import { normalizeSpanish } from '../core/wordUtils.js';

export const ORDER_VARIANTS = Object.freeze({
  order: { label: 'Ordenar la palabra', hint: 'Revisa qué sílaba debería escucharse primero.' },
  missing: { label: 'Completar la sílaba ausente', hint: 'Prueba a leer la palabra con la ficha elegida.' },
  intruder: { label: 'Encontrar la sílaba intrusa', hint: 'Hay una sílaba que no pertenece a la palabra.' },
  correctOrder: { label: 'Corregir el orden', hint: 'Compara cada lugar con el orden de la palabra.' },
  memory: { label: 'Reconstrucción con memoria', hint: 'Recuerda el principio y reconstruye la palabra paso a paso.' }
});

const positionContext = (index, length) => index === 0 ? 'initial' : index === length - 1 ? 'final' : 'medial';
const pieces = (values, id, kind = 'answer') => values.map((text, index) => ({ id: `${id}-${kind}-${index}`, text, originIndex: index, kind }));
const same = (a, b) => normalizeSpanish(a) === normalizeSpanish(b);

export function buildOrderChallengePool(words, options = {}, random = Math.random) {
  const variants = options.variants ?? Object.keys(ORDER_VARIANTS); const distractorCount = options.distractorCount ?? 2;
  const positions = options.targetPositions ?? ['initial', 'medial', 'final'];
  const inventory = [...new Set([...words.flatMap(word => word.syllables), 'ma', 'pa', 'la', 'sa', 'te', 'no', 'ri'])]; const pool = [];
  for (const word of words) for (const variant of variants) {
    const base = word.word; const syllables = [...word.syllables]; const root = `${word.id ?? base}|${variant}`;
    if (variant === 'order' || variant === 'memory') {
      const shuffled = derange(syllables, random); if (!shuffled) continue;
      pool.push(common(root, variant, word, pieces(shuffled, root), pieces(syllables, root, 'target'), variant === 'memory' ? 'Memoriza y reconstruye la palabra.' : 'Ordena las sílabas para formar la palabra.', { exposureMs: (options.memorySeconds ?? 5) * 1000, model: syllables }));
    } else if (variant === 'missing') {
      syllables.forEach((solution, index) => {
        if (!positions.includes(positionContext(index, syllables.length))) return;
        const distractors = inventory.filter(value => !same(value, solution) && !syllables.some(s => same(s, value))).slice(0, distractorCount);
        if (distractors.length !== distractorCount) return;
        const id = `${root}|${index}`; const offered = pieces([solution, ...distractors], id, 'choice');
        pool.push(common(id, variant, word, offered, [offered[0]], 'Elige la sílaba que falta.', { template: syllables.map((s, i) => i === index ? null : s), targetPosition: positionContext(index, syllables.length), distractors: offered.slice(1) }));
      });
    } else if (variant === 'intruder') {
      const intruder = inventory.find(value => !syllables.some(s => same(s, value))); if (!intruder) continue;
      const id = `${root}|${intruder}`; const correct = pieces(syllables, id); const extra = { id: `${id}-intruder`, text: intruder, kind: 'intruder', originIndex: null };
      const insertAt = Math.floor(random() * (correct.length + 1)); const initial = [...correct]; initial.splice(insertAt, 0, extra);
      pool.push(common(id, variant, word, initial, correct, 'Retira la sílaba que sobra.', { intruderId: extra.id, targetPosition: positionContext(Math.min(insertAt, syllables.length - 1), syllables.length), distractors: [extra] }));
    } else if (variant === 'correctOrder') {
      const pair = syllables.findIndex((value, index) => index < syllables.length - 1 && !same(value, syllables[index + 1])); if (pair < 0) continue;
      const target = pieces(syllables, root, 'target'); const initial = [...target]; [initial[pair], initial[pair + 1]] = [initial[pair + 1], initial[pair]];
      pool.push(common(`${root}|${pair}`, variant, word, initial, target, 'Intercambia dos sílabas para corregir la palabra.', { targetPosition: positionContext(pair, syllables.length) }));
    }
  }
  return pool;
}

function common(id, variant, word, initialPieces, targetPieces, instruction, extra = {}) {
  return { id, activity: 'order-syllables', variant, variantLabel: ORDER_VARIANTS[variant].label, baseWord: word.word, word: { id: word.id, text: word.word, syllables: [...word.syllables] }, instruction, initialPieces, targetPieces, distractors: [], operation: null, steps: [], ...extra };
}
function derange(values, random) { if (new Set(values.map(normalizeSpanish)).size < 2) return null; const result = [...values]; for (let n = 0; n < 12; n += 1) { for (let i = result.length - 1; i; i -= 1) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } if (!result.every((v, i) => same(v, values[i]))) return result; } const i = result.findIndex(v => !same(v, result[0])); [result[0], result[i]] = [result[i], result[0]]; return result; }
