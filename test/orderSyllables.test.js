import test from 'node:test';
import assert from 'node:assert/strict';
import { getFilteredWords, getWordComplexity, normalizeSpanish } from '../src/core/wordUtils.js';
import { ORDER_LEVELS } from '../src/exercises/orderSyllablesConfig.js';
import { createOrderSyllablesPlugin, ensureReorderedSyllables, isCorrectSyllableAnswer } from '../src/exercises/orderSyllablesPlugin.js';

test('cada nivel filtra suficientes palabras y respeta sus reglas', () => {
  for (const level of Object.values(ORDER_LEVELS)) assert.ok(getFilteredWords(level.linguisticFilters).length >= 20, `${level.label} sin 20 candidatas`);
  assert.ok(getFilteredWords(ORDER_LEVELS[3].linguisticFilters).every((word) => ['mixed','trabadas'].includes(getWordComplexity(word))));
});
test('desordena sin alterar las sílabas', () => { const source=['ca','mi','no']; const result=ensureReorderedSyllables(source,()=>0); assert.notDeepEqual(result,source); assert.deepEqual([...result].sort(),[...source].sort()); });
test('corrige respuestas conservando tildes y ñ', () => { assert.ok(isCorrectSyllableAnswer(['ni','ño'],['ni','ño'])); assert.ok(isCorrectSyllableAnswer(['ca','fé'],['ca','fé'])); assert.notEqual(normalizeSpanish('año'),normalizeSpanish('ano')); assert.notEqual(normalizeSpanish('café'),normalizeSpanish('cafe')); });
test('una pieza solo se usa una vez', () => { const game=createOrderSyllablesPlugin({random:()=>0}); const round=game.start({level:1,resetScore:true}); game.submit({type:'tap',pieceId:round.pieces[0].id}); const again=game.submit({type:'tap',pieceId:round.pieces[0].id}); assert.equal(again.status,'locked'); assert.equal(again.answer.length,1); });
test('métricas registran una comprobación incorrecta una vez', () => { const game=createOrderSyllablesPlugin({random:()=>0}); const round=game.start({level:1,resetScore:true}); round.pieces.forEach(p=>game.submit({type:'tap',pieceId:p.id})); assert.equal(game.submit({type:'validate'}).status,'incorrect'); assert.equal(game.getMetrics().incorrectAttempts,1); });
test('no hay doble puntuación al validar rápidamente', () => { const game=createOrderSyllablesPlugin({random:()=>0}); const round=game.start({level:1,resetScore:true}); const byText=new Map(round.pieces.map(p=>[p.text,p])); const word=getFilteredWords(ORDER_LEVELS[1].linguisticFilters).find(w=>w.id===round.wordId); word.syllables.forEach(s=>game.submit({type:'tap',pieceId:byText.get(s).id})); assert.equal(game.submit({type:'validate'}).status,'correct'); game.submit({type:'validate'}); assert.equal(game.getMetrics().score,1); assert.equal(game.getMetrics().roundsPlayed,1); });
test('no repite palabra mientras haya alternativas', () => { const game=createOrderSyllablesPlugin({random:()=>0}); let round=game.start({level:1,resetScore:true}); const ids=[]; for(let n=0;n<5;n++){ ids.push(round.wordId); const word=getFilteredWords(ORDER_LEVELS[1].linguisticFilters).find(w=>w.id===round.wordId); for(const syllable of word.syllables){ const piece=round.pieces.find(p=>p.text===syllable && !round.answer?.some(a=>a.id===p.id)); game.submit({type:'tap',pieceId:piece.id}); } game.submit({type:'validate'}); round=game.next(); } assert.equal(new Set(ids).size,5); });

function completeSession(level, total) {
  const game=createOrderSyllablesPlugin({random:()=>0}); let round=game.start({level,resetScore:true}); const ids=[];
  for(let n=0;n<total;n++){ ids.push(round.wordId); const word=getFilteredWords(ORDER_LEVELS[level].linguisticFilters).find(w=>w.id===round.wordId); const used=new Set(); for(const syllable of word.syllables){ const piece=round.pieces.find(p=>p.text===syllable&&!used.has(p.id)); used.add(piece.id); game.submit({type:'tap',pieceId:piece.id}); } assert.equal(game.submit({type:'validate'}).status,'correct'); if(n<total-1) round=game.next(); }
  assert.equal(game.getMetrics().roundsPlayed,total); assert.equal(new Set(ids).size,total);
}
test('flujo completo de 5 rondas en los tres niveles',()=>{ for(const level of [1,2,3]) completeSession(level,5); });
test('flujo completo de 10 rondas',()=>completeSession(2,10));
