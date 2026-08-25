import { getFilteredWords, getOrthographicLetters, getOrthographicLength, getWordComplexity, normalizeSpanish } from '../core/wordUtils.js';
import { normalizeSessionConfig } from '../core/sessionConfig.js';
import { planBalancedVariants } from '../core/challengePlanner.js';
import { getActivityDefinition } from './activityDefinitions.js';

export const LETTER_VARIANTS = Object.freeze({
  order: { label: 'Ordenar todas las letras', instruction: 'Ordena las letras para formar la palabra.', hint: 'Busca primero el comienzo de la palabra.' },
  missing: { label: 'Completar la letra ausente', instruction: 'Selecciona la letra que completa el hueco.', hint: 'Lee la palabra dejando una pausa en el hueco.' },
  intruder: { label: 'Detectar la letra intrusa', instruction: 'Retira la única letra que no pertenece a la palabra.', hint: 'Compara las letras con la palabra que puedes formar.' },
  swap: { label: 'Corregir dos letras intercambiadas', instruction: 'Corrige las dos letras que han cambiado de posición.', hint: 'Localiza el fragmento que no se lee como esperas.' },
  memory: { label: 'Memoria ortográfica', instruction: 'Recuerda la palabra y reconstruye sus letras.', hint: 'Evoca el inicio y el final antes de ordenar.' }
});
const ALPHABET = [...'abcdefghijklmnñopqrstuvwxyzáéíóúü'];
const shuffled = (values, random) => { const out=[...values]; for(let i=out.length-1;i;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];} return out; };
const lengthBand = n => n <= 4 ? '3-4' : n <= 6 ? '5-6' : n <= 8 ? '7-8' : '9+';
const changedShuffle = (letters, random) => { for(let i=0;i<12;i++){const x=shuffled(letters,random);if(x.join('')!==letters.join(''))return x;} return [...letters.slice(1),letters[0]]; };
const tiles = (letters, prefix='letter') => letters.map((text,index)=>({ id:`${prefix}-${index}`, text }));

export function buildOrderLettersChallengePool(words, options, random=Math.random) {
  const variants=options.variants??Object.keys(LETTER_VARIANTS), pool=[];
  for(const word of words){
    const letters=getOrthographicLetters(word); if(letters.length<3 || new Set(letters).size<2) continue;
    const target=tiles(letters,`${word.id??word.word}-target`), baseWord=word.word??word.text;
    for(const variant of variants){
      let initial, expected=target, template=null, model=null, exposureMs=null;
      if(variant==='order'||variant==='memory'){ initial=tiles(changedShuffle(letters,random),`${word.id??baseWord}-${variant}`); if(variant==='memory'){model=baseWord;exposureMs=options.memorySeconds*1000;} }
      else if(variant==='missing'){
        const position=Math.floor(random()*letters.length), correct=letters[position];
        const distractors=ALPHABET.filter(x=>x!==correct&&!letters.includes(x)).slice(0,options.distractorCount);
        if(distractors.length<options.distractorCount) continue;
        initial=tiles(shuffled([correct,...distractors],random),`${word.id??baseWord}-missing`); expected=[{id:'correct',text:correct}]; template=letters.map((x,i)=>i===position?'_':x).join('');
      } else if(variant==='intruder'){
        const choices=ALPHABET.filter(x=>!letters.includes(x)); if(!choices.length)continue; const extra=choices[Math.floor(random()*choices.length)];
        initial=tiles(shuffled([...letters,extra],random),`${word.id??baseWord}-intruder`); expected=target; template=baseWord;
      } else if(variant==='swap'){
        let a=0,b=1; while(b<letters.length&&letters[a]===letters[b])b++; if(b===letters.length)continue;
        const swapped=[...letters];[swapped[a],swapped[b]]=[swapped[b],swapped[a]];initial=tiles(swapped,`${word.id??baseWord}-swap`);
      } else continue;
      pool.push({id:`${word.id??baseWord}:${variant}`,word,baseWord,variant,variantLabel:LETTER_VARIANTS[variant].label,instruction:LETTER_VARIANTS[variant].instruction,initialPieces:initial,targetPieces:expected,template,model,exposureMs});
    }
  } return pool;
}

export function createOrderLettersPlugin({random=Math.random,getWords=getFilteredWords,clock=()=>Date.now(),setTimer=setTimeout}={}) {
  const s={challenges:[],index:0,answer:[],history:[],results:[],complete:false,config:null,startedAt:0,incorrect:0,help:0,movements:0,undo:0,resets:0,restarts:0,endedEarly:false,memoryVisible:false};
  const round=()=>s.challenges[s.index];
  const snapshot=(status='ready')=>{const r=round();if(!r)return{status:'empty'};return{status,round:s.index+1,total:s.challenges.length,variant:r.variant,variantLabel:r.variantLabel,instruction:r.instruction,pieces:r.initialPieces,answer:[...s.answer],expectedLength:r.targetPieces.length,template:r.template,model:s.memoryVisible?r.model:undefined,memoryVisible:s.memoryVisible,exposureMs:r.exposureMs,hint:LETTER_VARIANTS[r.variant].hint,word:status==='correct'?r.baseWord:undefined};};
  const prepare=()=>{const r=round();s.answer=['intruder','swap'].includes(r.variant)?structuredClone(r.initialPieces):[];s.history=[];s.complete=false;s.startedAt=clock();s.incorrect=0;s.help=0;s.movements=0;s.undo=0;s.resets=0;s.memoryVisible=r.variant==='memory';if(s.memoryVisible)setTimer(()=>{s.memoryVisible=false;},r.exposureMs);};
  function start(raw={}){const config=normalizeSessionConfig({activityId:'order-letters',...raw});const words=getWords().filter(w=>config.linguistic.syllableCounts.includes(w.syllableCount>=4?4:w.syllableCount)&&config.linguistic.complexities.includes(getWordComplexity(w))&&config.linguistic.frequencies.includes(w.frequency)&&config.activityOptions.letterLengths.includes(lengthBand(getOrthographicLength(w))));const pool=buildOrderLettersChallengePool(words,config.activityOptions,random);const plan=planBalancedVariants(pool,config.activityOptions.variants,config.rounds,random);if(plan.status!=='ready')return{status:'insufficient',...plan};Object.assign(s,{challenges:plan.challenges,index:0,results:[],config,endedEarly:false,restarts:0});prepare();return snapshot();}
  const save=()=>s.history.push(structuredClone(s.answer));
  function submit({type,pieceId,fromIndex,toIndex}={}){if(!round()||s.complete)return snapshot('locked');if(type==='help'){s.help++;return snapshot('help');}if(type==='undo'){if(s.history.length)s.answer=s.history.pop();s.undo++;return snapshot('progress');}if(type==='clear'){save();s.answer=['intruder','swap'].includes(round().variant)?structuredClone(round().initialPieces):[];s.resets++;return snapshot('progress');}if(type==='tap'){const p=round().initialPieces.find(x=>x.id===pieceId);if(!p||s.answer.some(x=>x.id===p.id))return snapshot('locked');save();s.answer.push(p);s.movements++;return snapshot('progress');}if(type==='remove-piece'){const i=s.answer.findIndex(x=>x.id===pieceId);if(i<0)return snapshot('locked');save();s.answer.splice(i,1);s.movements++;return snapshot('progress');}if(type==='move'||type==='drop'){if(!Number.isInteger(fromIndex)||!Number.isInteger(toIndex)||fromIndex<0||fromIndex>=s.answer.length||toIndex<0||toIndex>=s.answer.length)return snapshot('locked');save();const[p]=s.answer.splice(fromIndex,1);s.answer.splice(toIndex,0,p);s.movements++;return snapshot('progress');}if(type!=='validate'||s.answer.length!==round().targetPieces.length)return snapshot('locked');const response=s.answer.map(x=>x.text).join('');const target=round().targetPieces.map(x=>x.text).join('');const correct=round().variant==='intruder'?[...normalizeSpanish(response)].sort().join('')===[...normalizeSpanish(target)].sort().join(''):normalizeSpanish(response)===normalizeSpanish(target);if(!correct){s.incorrect++;return snapshot('incorrect');}s.complete=true;s.results.push(record('correct',response));return snapshot('correct');}
  const record=(status,response=s.answer.map(x=>x.text).join(''))=>({word:round().baseWord,targetWord:round().baseWord,variant:round().variant,response,finalResponse:response,status,firstTry:status==='correct'&&s.incorrect===0,incorrectAttempts:s.incorrect,movements:s.movements,helpUses:s.help,undoUses:s.undo,restarts:s.resets,durationMs:Math.max(0,clock()-s.startedAt),skipped:status==='skipped'});
  function next(){if(!s.complete)return snapshot('locked');if(++s.index>=s.challenges.length)return{status:'complete'};prepare();return snapshot();}
  function restartRound(){s.restarts++;prepare();return snapshot();} function skipRound(){s.results.push(record('skipped'));s.complete=true;return snapshot('skipped');}
  function getMetrics(){const correct=s.results.filter(x=>x.status==='correct');return{score:correct.length,roundsPlayed:s.results.length,plannedRounds:s.config?.rounds??0,completedRounds:correct.length,correctRounds:correct.length,skippedRounds:s.results.filter(x=>x.skipped).length,uncompletedRounds:Math.max(0,(s.config?.rounds??0)-s.results.length),endedEarly:s.endedEarly,sessionCompleted:!s.endedEarly&&s.results.length===(s.config?.rounds??0),firstTryCorrect:correct.filter(x=>x.firstTry).length,incorrectAttempts:s.results.reduce((n,x)=>n+x.incorrectAttempts,0),totalMovements:s.results.reduce((n,x)=>n+x.movements,0),totalUndoUses:s.results.reduce((n,x)=>n+x.undoUses,0),totalResetUses:s.results.reduce((n,x)=>n+x.restarts,0),therapistRestarts:s.restarts,results:structuredClone(s.results),recentWordIds:s.results.map(x=>x.word)};}
  return{...getActivityDefinition('order-letters'),start,submit,next,restartRound,skipRound,finishSession(){s.endedEarly=true;return getMetrics();},getMetrics,getSessionState:getMetrics};
}
