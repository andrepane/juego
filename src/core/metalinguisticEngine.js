const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü']);
const SYLLABLE_POOL = ['MA', 'TA', 'LU', 'PO', 'RI', 'SA', 'NE', 'ZO', 'CRA', 'BLI'];

function normalizeInput(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '');
}

function splitSyllables(word) {
  if (!word) return [];

  const letters = [...word];
  const syllables = [];
  let current = '';

  for (let index = 0; index < letters.length; index += 1) {
    const letter = letters[index];
    const next = letters[index + 1];
    current += letter;

    const isVowel = VOWELS.has(letter);
    const nextIsVowel = VOWELS.has(next);

    if (isVowel && (!next || nextIsVowel)) {
      syllables.push(current);
      current = '';
    }
  }

  if (current) {
    if (syllables.length) {
      syllables[syllables.length - 1] += current;
    } else {
      syllables.push(current);
    }
  }

  return syllables;
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function normalizeAnswer(value) {
  return String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9Ñ]/g, '');
}

function createChoiceOptions(correctValue, fallbackValues = []) {
  const unique = new Set([correctValue, ...fallbackValues]);
  return [...unique].slice(0, 4).sort(() => Math.random() - 0.5);
}

function buildSession(baseWord) {
  const word = normalizeInput(baseWord);
  const syllables = splitSyllables(word);
  const letters = [...word];

  if (!word || letters.length < 2) {
    return { word, syllables, letters, challenges: [] };
  }

  const challenges = [];

  challenges.push({
    key: 'count_syllables',
    type: 'choice',
    prompt: '¿Cuántas sílabas tiene?',
    answer: String(syllables.length),
    options: createChoiceOptions(String(syllables.length), ['1', '2', '3', '4', '5'])
  });

  challenges.push({
    key: 'count_letters',
    type: 'choice',
    prompt: '¿Cuántas letras tiene?',
    answer: String(letters.length),
    options: createChoiceOptions(String(letters.length), ['3', '4', '5', '6', '7', '8'])
  });

  if (syllables.length > 1) {
    const removedSyllable = syllables[syllables.length - 1];
    challenges.push({
      key: 'omit_last_syllable',
      type: 'text',
      prompt: 'Si quito la última sílaba, ¿qué palabra queda?',
      answer: syllables.slice(0, -1).join(''),
      reveal: `Última sílaba objetivo: ${removedSyllable}`
    });

    const addSyllable = pickRandom(SYLLABLE_POOL);
    challenges.push({
      key: 'add_syllable',
      type: 'text',
      prompt: `Si añado “${addSyllable}” al final, ¿qué palabra obtengo?`,
      answer: `${word}${addSyllable}`
    });

    challenges.push({
      key: 'invert_syllables',
      type: 'text',
      prompt: 'Invierte las sílabas.',
      answer: [...syllables].reverse().join('')
    });

    const from = syllables[0];
    const to = pickRandom(SYLLABLE_POOL.filter((value) => value !== from));
    challenges.push({
      key: 'replace_syllable',
      type: 'text',
      prompt: `Cambia “${from}” por “${to}”.`,
      answer: [to, ...syllables.slice(1)].join('')
    });
  }

  const removableLetter = letters[0];
  challenges.push({
    key: 'omit_letter',
    type: 'text',
    prompt: `¿Qué ocurre si quitamos la letra ${removableLetter}?`,
    answer: letters.filter((letter) => letter !== removableLetter).join('') || '∅'
  });

  return { word, syllables, syllableCount: syllables.length, letters, challenges };
}

function validateAnswer(challenge, userAnswer) {
  const normalizedExpected = normalizeAnswer(challenge.answer);
  const normalizedInput = normalizeAnswer(userAnswer);
  return normalizedInput === normalizedExpected;
}

export function createMetalinguisticEngine() {
  return {
    normalizeInput,
    splitSyllables,
    buildSession,
    validateAnswer
  };
}
