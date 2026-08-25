import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderLettersChallengePool, createOrderLettersPlugin, LETTER_VARIANTS } from '../src/exercises/orderLettersPlugin.js';
import { getOrthographicLetters } from '../src/core/wordUtils.js';
import { ACTIVITY_IDS, AVAILABLE_ACTIVITY_IDS } from '../src/exercises/activityDefinitions.js';
import { normalizeSessionConfig, SESSION_CONFIG_ACTIVITY_IDS } from '../src/core/sessionConfig.js';
import { activityComposition } from '../src/app/activityComposition.js';

const words=[
 {id:'casa',word:'casa',syllables:['ca','sa'],syllableCount:2,frequency:1,structure:'CV-CV'},
 {id:'nino',word:'niño',syllables:['ni','ño'],syllableCount:2,frequency:1,structure:'CV-CV'},
 {id:'pinguino',word:'pingüino',syllables:['pin','güi','no'],syllableCount:3,frequency:1,structure:'CVC-CV-CV'},
 {id:'arbol',word:'árbol',syllables:['ár','bol'],syllableCount:2,frequency:1,structure:'VC-CVC'}
];
const options={variants:Object.keys(LETTER_VARIANTS),distractorCount:3,memorySeconds:2,letterLengths:['3-4','5-6','7-8','9+']};

test('deriva grafemas ortográficos conservando repetidas, tildes, ñ y ü',()=>{
 assert.deepEqual(getOrthographicLetters(words[0]),['c','a','s','a']);
 assert.deepEqual(getOrthographicLetters('árbol'),['á','r','b','o','l']);
 assert.deepEqual(getOrthographicLetters('niño'),['n','i','ñ','o']);
 assert.ok(getOrthographicLetters('pingüino').includes('ü'));
 const order=buildOrderLettersChallengePool([words[0]],options,()=>0.2).find(x=>x.variant==='order');
 assert.equal(new Set(order.initialPieces.map(x=>x.id)).size,4);
});

test('construye las cinco variantes con retos inequívocos',()=>{
 const pool=buildOrderLettersChallengePool(words,options,()=>0.31);
 assert.deepEqual(new Set(pool.map(x=>x.variant)),new Set(Object.keys(LETTER_VARIANTS)));
 for(const c of pool.filter(x=>x.variant==='missing')) assert.equal(c.initialPieces.filter(x=>x.text===c.targetPieces[0].text).length,1);
 for(const c of pool.filter(x=>x.variant==='intruder')) assert.equal(c.initialPieces.filter(x=>!getOrthographicLetters(c.word).includes(x.text)).length,1);
 for(const c of pool.filter(x=>x.variant==='swap')) assert.equal(c.initialPieces.filter((x,i)=>x.text!==c.targetPieces[i].text).length,2);
});

test('actividad está compuesta y solo las disponibles tienen configuración',()=>{
 assert.ok(ACTIVITY_IDS.includes('identify-rhymes'));
 assert.ok(!AVAILABLE_ACTIVITY_IDS.includes('identify-rhymes'));
 assert.ok(!SESSION_CONFIG_ACTIVITY_IDS.includes('identify-rhymes'));
 assert.equal(activityComposition.resolveAvailable('order-letters')?.definition.id,'order-letters');
 assert.equal(activityComposition.resolveAvailable('identify-rhymes'),null);
 assert.doesNotThrow(()=>normalizeSessionConfig({activityId:'identify-rhymes'}));
});

test('tap y drop producen interacción equivalente y registran métricas',()=>{
 const config={rounds:1,linguistic:{syllableCounts:[2],complexities:['simple'],frequencies:[1]},activityOptions:{...options,variants:['order'],letterLengths:['3-4']}};
 const make=()=>createOrderLettersPlugin({random:()=>0.2,getWords:()=>[words[0]],clock:(()=>{let n=0;return()=>++n;})()});
 const a=make(), start=a.start(config); for(const target of getOrthographicLetters('casa')){const p=start.pieces.find(x=>x.text===target&&!a.submit({}).answer.some(y=>y.id===x.id));a.submit({type:'tap',pieceId:p.id});} assert.equal(a.submit({type:'validate'}).status,'correct');
 const m=a.getMetrics();assert.equal(m.results[0].targetWord,'casa');assert.equal(m.results[0].firstTry,true);assert.equal(m.results[0].movements,4);
});

test('planifica de forma determinista 5, 10 y 20 rondas equilibradas y detecta escasez',()=>{
 const many=Array.from({length:8},(_,i)=>({id:`w${i}`,word:['casa','mesa','luna','pato','gato','mapa','dedo','foca'][i],syllables:['x','x'],syllableCount:2,frequency:1,structure:'CV-CV'}));
 for(const rounds of [5,10,20]){
  const plugin=createOrderLettersPlugin({random:()=>0.37,getWords:()=>many});
  const result=plugin.start({rounds,linguistic:{syllableCounts:[2],complexities:['simple'],frequencies:[1]},activityOptions:{...options,letterLengths:['3-4']}});
  assert.equal(result.status,'ready'); assert.equal(result.total,rounds);
 }
 const insufficient=createOrderLettersPlugin({random:()=>0.37,getWords:()=>[words[0]]}).start({rounds:20,linguistic:{syllableCounts:[2],complexities:['simple'],frequencies:[1]},activityOptions:{...options,letterLengths:['3-4']}});
 assert.equal(insufficient.status,'insufficient');
});
