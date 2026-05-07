export function generateNumericDistractors(correctValue, min = 1, max = 5, total = 3) {
  const candidates = [];

  for (let value = min; value <= max; value += 1) {
    if (value !== correctValue) {
      candidates.push(value);
    }
  }

  candidates.sort((a, b) => Math.abs(a - correctValue) - Math.abs(b - correctValue));

  const closest = candidates.slice(0, Math.max(0, total - 1));
  return [...closest, correctValue].sort(() => Math.random() - 0.5);
}

export function createOption(id, label) {
  return { id, label: String(label) };
}
