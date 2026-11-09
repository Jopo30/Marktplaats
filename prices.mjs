// Manually reviewed retailer pages; snapshots, not real-time or lowest-price claims.
const checkedAt='2026-11-09';
export const references=[
  {model:'DJR187',sku:'DJR187Z',amount:193.59,shop:'Gereedschapcentrum',url:'https://www.gereedschapcentrum.nl/makita-djr187z-18v-li-ion-accu-reciprozaag-body-snelwissel-variabel-koolborstelloos.html'},
  {model:'DJR186',sku:'DJR186Z',amount:176,shop:'Baptist',url:'https://baptist.nl/products/makita-djr186z-accu-reciprozaag-18-v-zonder-accu'},
  {model:'DHP484',sku:'DHP484Z',amount:140.36,shop:'AIC Visser',url:'https://www.aicvisser.com/p/makita-18v-klopboor-schroefmachine-54nm-dhp484z'},
  {model:'DTM51',sku:'DTM51Z',amount:141.99,shop:'Contorion',url:'https://www.contorion.nl/p/makita-accu-multigereedschap-dtm51z-soloversie-92161096'}
].map(r=>({...r,checkedAt,variant:'Losse machine zonder accu en lader',vatIncluded:true,shippingIncluded:false}));
export function comparison(item,now=Date.now()){
  const title=item.title || '',text=title+' '+(item.description || '');
  const unknown=reason=>({amount:null,reason});
  if(!/\bmakita\b/i.test(title))return unknown('Geen gecontroleerde prijsreferentie voor dit merk/model.');
  if(/koffer|kist|onderdeel|zaagblad|ophanger|set|partij/i.test(title))return unknown('Set of accessoire: uitvoering niet vergelijkbaar met een losse machine.');
  const matches=references.filter(r=>new RegExp('\\b'+r.model+'(?:Z)?\\b','i').test(title));
  if(matches.length!==1)return unknown('Geen gecontroleerde prijsreferentie voor dit model.');
  const ref=matches[0];
  if(now-Date.parse(ref.checkedAt+'T00:00:00Z')>30*86400000)return unknown('Prijsreferentie ouder dan 30 dagen; opnieuw controleren.');
  const includesExtras=/(?:met|inclusief|incl\.?|\+)\s+(?:(?:een|twee|[0-9]+)\s+)?(?:accu|lader|koffer)/i.test(text);
  const body=/\bbody\b|\bsolo(?:versie)?\b|zonder accu|excl\.? accu/i.test(text) || new RegExp('\\b'+ref.sku+'\\b','i').test(title);
  if(!body || includesExtras)return unknown('Accu, lader of uitvoering onduidelijk; geen betrouwbare vergelijking.');
  const difference=Math.round((ref.amount-item.price)*100)/100;
  return {...ref,difference,percentage:Math.round(difference/ref.amount*100),reason:null};
}
