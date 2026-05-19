import { WORDS } from '../data/words/index.js';
import { syllabifySpanishWord } from './wordProcessor.js';


const normalize = (raw) => String(raw || '')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[^A-ZÑ]/g, '');

const WORD_SYLLABLES = new Map(
  WORDS
    .filter((entry) => entry?.word && Array.isArray(entry?.syllables) && entry.syllables.length > 0)
    .map((entry) => [
      normalize(entry.word),
      entry.syllables
        .map((part) => normalize(part))
        .filter(Boolean)
    ])
    .filter(([, syllables]) => syllables.length > 0)
);

function splitSyllables(word) {
  if (!word) return [];

  const normalizedWord = normalize(word);
  const knownSyllables = WORD_SYLLABLES.get(normalizedWord);
  if (knownSyllables) return [...knownSyllables];

  const { syllables } = syllabifySpanishWord(normalizedWord);
  if (Array.isArray(syllables) && syllables.length > 0) {
    return syllables.map((part) => normalize(part));
  }

  return [normalizedWord];
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
