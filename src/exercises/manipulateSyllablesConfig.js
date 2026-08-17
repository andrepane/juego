export const MANIPULATION_OPERATIONS = {
  remove: { id: 'remove', label: 'Quitar' },
  add: { id: 'add', label: 'Añadir' },
  replace: { id: 'replace', label: 'Sustituir' },
  invert: { id: 'invert', label: 'Invertir' }
};

export const MANIPULATION_LEVELS = {
  1: { id: 1, label: 'Nivel 1', description: 'Palabras bisílabas sencillas; cambios al principio o al final.', filters: { syllableCount: 2, complexity: 'simple' } },
  2: { id: 2, label: 'Nivel 2', description: 'Palabras trisílabas sencillas; cambios iniciales, mediales o finales.', filters: { syllableCount: 3, complexity: 'simple' } },
  3: { id: 3, label: 'Nivel 3', description: 'Palabras de dos o más sílabas, con estructuras mixtas o trabadas.', filters: { complexity: ['mixed', 'trabadas'] } }
};

// Inventario local revisable: unidades pronunciables y apropiadas para público infantil.
export const SAFE_SYLLABLES = {
  simple: ['ma', 'pa', 'la', 'sa', 'te', 'mi', 'no', 'lu'],
  complex: ['pla', 'bra', 'tren', 'flor', 'sol', 'mar', 'cru', 'pan']
};

export const SESSION_LENGTHS = [5, 10, 15, 20];

export function resolveManipulationLevel(level = 1) {
  return MANIPULATION_LEVELS[level] ?? MANIPULATION_LEVELS[1];
}
