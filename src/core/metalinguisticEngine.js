import { WORDS } from '../data/words/index.js';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü']);

const normalize = (raw) => String(raw || '')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[^A-ZÑ]/g, '');

function splitSyllables(word) {
  if (!word) return [];

  const letters = [...word];
  const syllables = [];
  let current = '';

  for (let i = 0; i < letters.length; i += 1) {
    const letter = letters[i];
    const next = letters[i + 1];
    current += letter;

    if (VOWELS.has(letter) && (!next || VOWELS.has(next))) {
      syllables.push(current);
      current = '';
    }
  }

  if (current) {
    if (syllables.length) syllables[syllables.length - 1] += current;
    else syllables.push(current);
  }

  return syllables;
}

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function omitMiddle(parts) {
  const index = Math.floor(parts.length / 2);
  return parts.filter((_, i) => i !== index);
}

function swapFirstLast(parts) {
  if (parts.length < 2) return parts;
  const next = [...parts];
  [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
  return next;
}

function buildSyllableChallenge(word) {
  const parts = splitSyllables(word);
  if (parts.length < 2) {
    return {
      instruction: 'Quita la única sílaba.',
      answer: '',
      baseParts: parts
    };
  }

  const operations = [
    {
      instruction: 'Quita la sílaba del medio.',
      transform: omitMiddle
    },
    {
      instruction: 'Quita la última sílaba.',
      transform: (p) => p.slice(0, -1)
    },
    {
      instruction: 'Intercambia la primera sílaba con la última.',
      transform: swapFirstLast
    }
  ];

  const op = randomOf(operations);
  return {
    instruction: op.instruction,
    answer: op.transform(parts).join(''),
    baseParts: parts
  };
}

function buildLetterChallenge(word) {
  const parts = [...word];
  const operations = [
    {
      instruction: 'Quita la letra del medio.',
      transform: omitMiddle
    },
    {
      instruction: 'Quita la última letra.',
      transform: (p) => p.slice(0, -1)
    },
    {
      instruction: 'Invierte la primera y la última letra.',
      transform: swapFirstLast
    }
  ];

  const op = randomOf(operations);
  return {
    instruction: op.instruction,
    answer: op.transform(parts).join(''),
    baseParts: parts
  };
}

function pickWord() {
  const valid = WORDS
    .map((item) => normalize(item.word))
    .filter((word) => word.length >= 3);

  return randomOf(valid);
}

function createChallenge(word, mode) {
  const safeWord = normalize(word);
  return mode === 'letters' ? buildLetterChallenge(safeWord) : buildSyllableChallenge(safeWord);
}

function isCorrect(challenge, answer) {
  return normalize(challenge.answer) === normalize(answer);
}

export function createMetalinguisticEngine() {
  return {
    splitSyllables,
    pickWord,
    createChallenge,
    isCorrect
  };
}
