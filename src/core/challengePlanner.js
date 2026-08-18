/** Build a balanced, non-repeating plan from challenges generated ahead of play. */
export function planBalancedVariants(pool, variants, total, random = Math.random) {
  const selected = [...new Set(variants)];
  const availableByVariant = Object.fromEntries(selected.map(id => [id, pool.filter(item => item.variant === id).length]));
  if (!selected.length || total < 1) return insufficient(availableByVariant, {});
  const base = Math.floor(total / selected.length); const remainder = total % selected.length;
  const extras = selected.filter(id => availableByVariant[id] >= base + 1);
  if (selected.some(id => availableByVariant[id] < base) || extras.length < remainder) {
    return insufficient(availableByVariant, Object.fromEntries(selected.map(id => [id, base])));
  }
  const neededByVariant = Object.fromEntries(selected.map(id => [id, base + (extras.slice(0, remainder).includes(id) ? 1 : 0)]));
  const schedule = balancedSchedule(neededByVariant, random); const challenges = []; const used = new Set(); let previousWord;
  for (const variant of schedule) {
    let choices = pool.filter(item => item.variant === variant && !used.has(item.id));
    const alternatives = choices.filter(item => item.baseWord !== previousWord);
    if (alternatives.length) choices = alternatives;
    if (!choices.length) return insufficient(availableByVariant, neededByVariant);
    const challenge = choices[Math.floor(random() * choices.length)];
    challenges.push(challenge); used.add(challenge.id); previousWord = challenge.baseWord;
  }
  return { status: 'ready', challenges, schedule, availableByVariant, neededByVariant };
}

export function balancedSchedule(counts, random = Math.random) {
  const remaining = { ...counts }; const result = [];
  while (Object.values(remaining).some(value => value > 0)) {
    const available = Object.keys(remaining).filter(id => remaining[id] > 0);
    const nonRepeat = available.filter(id => id !== result.at(-1));
    const candidates = nonRepeat.length ? nonRepeat : available;
    const maximum = Math.max(...candidates.map(id => remaining[id]));
    const tied = candidates.filter(id => remaining[id] === maximum);
    const next = tied[Math.floor(random() * tied.length)]; result.push(next); remaining[next] -= 1;
  }
  return result;
}

function insufficient(availableByVariant, neededByVariant) { return { status: 'insufficient', challenges: [], availableByVariant, neededByVariant }; }
