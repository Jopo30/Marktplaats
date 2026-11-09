import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize,validate,search} from './provider.mjs';
const listing=(id='m123',extra={})=>({itemId:id,title:'Makita',description:'Gebruikt',priceInfo:{priceType:'FIXED',priceCents:10000},location:{distanceMeters:10000,cityName:'Harlingen'},...extra});
test('rejects invalid input before fetching',()=>{
  assert.throws(()=>validate({query:'Makita',postcode:'',maxPrice:250}));
  assert.throws(()=>validate({query:'Makita',postcode:'8861AA',maxPrice:-1}));
});
test('deduplicates and excludes defects, unknown prices, distant and unknown locations',()=>{
  const items=[listing(),listing(),listing('m2',{description:'werkt niet'}),listing('m3',{priceInfo:{priceType:'BID',priceCents:100}}),listing('m4',{location:{distanceMeters:100001}}),listing('m5',{location:{}}),listing('m6',{description:'Radio gaat ineens niet meer aan'})];
  assert.equal(normalize({listings:items},250).length,1);
  assert.equal(normalize({listings:[listing()]},50).length,0);
  assert.throws(()=>normalize({unexpected:[]},250));
});
test('sends distance and condition filters and does not retry blocked requests',async()=>{
  let calls=0;
  await assert.rejects(search({query:'Makita',postcode:'8861 AA',maxPrice:250},async url=>{
    calls++;assert.equal(url.searchParams.get('distanceMeters'),'100000');
    assert.equal(url.searchParams.get('postcode'),'8861AA');
    assert.equal(url.searchParams.get('attributesById[]'),'32');
    return {status:403,ok:false};
  }),/beperkt/);
  assert.equal(calls,1);
});
