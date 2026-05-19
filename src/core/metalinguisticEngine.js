const VOWELS = new Set(['A','E','I','O','U','Á','É','Í','Ó','Ú','Ü']);

function normalizeInput(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '');
}

function splitSyllables(word) {
  if (!word) return [];
  const chars = [...word];
  const syllables = [];
  let current = '';

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    const next = chars[i + 1];
    current += char;

    const isVowel = VOWELS.has(char);
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

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildChallenges(word) {
  const syllables = splitSyllables(word);
  const letters = [...word];

  if (!word || syllables.length === 0 || letters.length < 2) {
    return [];
  }

  const challenges = [];

  challenges.push({
    type: 'separacion',
    prompt: 'Separa la palabra en sílabas.',
    source: word,
    result: syllables.join(' - ')
  });

  if (syllables.length > 1) {
    const omitted = syllables[syllables.length - 1];
    challenges.push({
      type: 'omision',
      prompt: `Quita la sílaba “${omitted}”.`,
      source: word,
      result: syllables.slice(0, -1).join('')
    });

    challenges.push({
      type: 'inversion',
      prompt: 'Invierte el orden de las sílabas.',
      source: word,
      result: [...syllables].reverse().join(' - ')
    });

    const replacements = ['MA', 'LA', 'TO', 'RI', 'SU'];
    const first = syllables[0];
    const replacement = randomOf(replacements.filter((item) => item !== first)) || 'MA';
    const replaced = [replacement, ...syllables.slice(1)].join('');
    challenges.push({
      type: 'sustitucion',
      prompt: `Cambia “${first}” por “${replacement}”.`,
      source: word,
      result: replaced
    });
  }

  if (word.length >= 3) {
    const removedLetter = letters[letters.length - 1];
    challenges.push({
      type: 'omision-letra',
      prompt: `Quita la letra final “${removedLetter}”.`,
      source: word,
      result: letters.slice(0, -1).join('')
    });

    challenges.push({
      type: 'inversion-letras',
      prompt: 'Invierte todas las letras.',
      source: word,
      result: [...letters].reverse().join('')
    });
  }

  if (syllables.length > 1) {
    const baseWithoutLast = syllables.slice(0, -1).join('');
    const addBack = syllables[syllables.length - 1];
    challenges.push({
      type: 'adicion',
      prompt: `Desde “${baseWithoutLast}”, añade “${addBack}”.`,
      source: baseWithoutLast,
      result: word
    });
  }

  const pseudoSeed = ['BRI', 'TA', 'NOL', 'PE', 'ZU', 'CRA'];
  const pseudo = `${randomOf(pseudoSeed)}${randomOf(pseudoSeed)}${randomOf(pseudoSeed)}`;
  challenges.push({
    type: 'pseudopalabra',
    prompt: 'Transforma en una pseudopalabra (sin significado).',
    source: word,
    result: pseudo
  });

  return challenges;
}

export function createMetalinguisticEngine() {
  return {
    normalizeInput,
    splitSyllables,
    buildChallenges
  };
}
