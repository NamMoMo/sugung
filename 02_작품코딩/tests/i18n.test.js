import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chests} from '../src/journey.js';
import {treasures} from '../src/treasure-data.js';
import {actionCues,species} from '../src/action-cues.js';
import {translate,createLocalizer,initialLanguage} from '../src/i18n-core.js';
import {resultURL,sharedResultFromHash} from '../src/result-link.js';
const ko=/[가-힣]/;
test('all scene, action, treasure and UI translation keys have English copy',()=>{
 const localize=createLocalizer('en');
 for(const value of [chests,treasures,actionCues,species])assert.equal(ko.test(JSON.stringify(localize(value))),false);
 const keys=JSON.parse(readFileSync(new URL('../docs/translation-keys.json',import.meta.url)));
 for(const key of keys)assert.equal(ko.test(translate('en',key)),false,key);
 assert.equal(translate('en','찾은 보물 {0} / 6, 풀어낸 봉인 {1} / 6',2,1),'Treasures found 2 / 6, seals released 1 / 6');
 assert.equal(translate('ko','봉인 하나가 풀렸어요. {0} / 6',2),'봉인 하나가 풀렸어요. 2 / 6');
});
test('English reports retain language and choices without changing legacy result codes',()=>{
 const answers=Object.fromEntries(chests.map(c=>[c.id,c.scenes.map(s=>s.options[0][0])]));
 const en=new URL(resultURL(answers,'https://example.com/','en'));
 assert.equal(en.search,'?lang=en');assert.deepEqual(sharedResultFromHash(en.hash).answers,answers);
 assert.equal(initialLanguage(en),'en');
 assert.equal(initialLanguage(new URL('https://example.com/?lang=en')),'ko');
 const legacy=new URL(resultURL(answers,'https://example.com/'));
 assert.equal(legacy.search,'');assert.equal(initialLanguage(legacy),'ko');assert.equal(legacy.hash,en.hash);
});
