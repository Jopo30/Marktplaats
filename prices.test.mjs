import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparison} from './prices.mjs';
const now=Date.parse('2026-11-09');
const item={title:'Makita DJR187 18V reciprozaag body',description:'Zonder accu',price:110};
test('compares sourced body price and calculates exact difference',()=>{
 const p=comparison(item,now);assert.equal(p.amount,193.59);assert.equal(p.difference,83.59);assert.equal(p.percentage,43);assert.ok(p.url.startsWith('https://'));
});
test('does not compare kits, accessories, other models, ambiguous variants or stale prices',()=>{
 for(const title of ['Makita DJR187RTJ','Makita DJR187ZJ','Makita DJR187 koffer','Makita DJR187','Makita DJR187 body met accu','Makita DJR187 set','Makita DJR1870 body','DeWalt DJR187 body'])
   assert.equal(comparison({...item,title,description:''},now).amount,null,title);
 assert.equal(comparison(item,now+31*86400000).amount,null);
 assert.equal(comparison({...item,description:'Inclusief accu en lader'},now).amount,null);
});
