// Search protocol: PonClick/marktplaats-mcp (MIT), commit 3923ab2aadef47ed2af6ee3b51a9ff3863cb250e.
// See LICENSE-PonClick. This adapter does not run an MCP server.
export function validate(input) {
  const query = String(input.query || '').trim();
  const postcode = String(input.postcode || '').replace(/\s/g, '').toUpperCase();
  const maxPrice = Number(input.maxPrice ?? 250);
  if (!query || query.length > 80) throw new Error('Vul een zoekterm van maximaal 80 tekens in.');
  if (!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postcode)) throw new Error('Vul een volledige Nederlandse postcode in.');
  if (!Number.isFinite(maxPrice) || maxPrice <= 0 || maxPrice > 10000) throw new Error('Kies een aankoopbudget tussen 1 en 10000 euro.');
  return {query, postcode, maxPrice};
}
export function normalize(data, maxPrice) {
  if (!Array.isArray(data.listings)) throw new Error('De gegevensbron geeft een onbekend antwoord.');
  const seen = new Set();
  return data.listings.flatMap(item => {
    const id = item.itemId, distance = item.location?.distanceMeters, cents = item.priceInfo?.priceCents;
    const text = (item.title || '') + ' ' + (item.description || '');
    const condition = item.attributes?.find(a => a.key === 'condition')?.value || '';
    if (!/^m\d+$/.test(id || '') || seen.has(id)) return [];
    seen.add(id);
    if (!Number.isFinite(distance) || distance < 0 || distance > 100000) return [];
    if (item.priceInfo?.priceType !== 'FIXED' || !Number.isFinite(cents) || cents <= 0 || cents > maxPrice * 100) return [];
    if (/defect|werkt niet|werkt.{0,12}niet meer|niet werkend|reparatie|voor onderdelen|gaat.{0,20}niet.{0,12}aan|kapot|doet.{0,12}niet|ongetest/i.test(text + ' ' + condition)) return [];
    if (/te huur|huurprijs|verhuur|gezocht|reeds verkocht/i.test(text)) return [];
    return [{id,title:String(item.title || ''),description:String(item.description || ''),price:cents/100,
      city:String(item.location?.cityName || ''),distanceKm:distance/1000,condition,
      url:'https://link.marktplaats.nl/' + id,assessment:'Werking controleren',valuation:'Onvoldoende prijsdata voor winstberekening'}];
  });
}
export async function search(input, fetcher = fetch) {
  const {query,postcode,maxPrice} = validate(input);
  const url = new URL('https://www.marktplaats.nl/lrp/api/search');
  url.search = new URLSearchParams({query,postcode,distanceMeters:'100000',limit:'50',offset:'0',
    searchInTitleAndDescription:'true',viewOptions:'list-view',sortBy:'SORT_INDEX',sortOrder:'DECREASING',
    'attributesById[]':'32','attributeRanges[]':'PriceCents:0:' + maxPrice*100});
  const response = await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});
  if ([403,429].includes(response.status)) throw new Error('Marktplaats beperkt de toegang. Er wordt niet automatisch opnieuw geprobeerd.');
  if (!response.ok) throw new Error('Gegevens ophalen mislukt (' + response.status + ').');
  return {source:'Marktplaats website (onofficiële proef)',fetchedAt:new Date().toISOString(),
    listings:normalize(await response.json(),maxPrice),
    note:'Maximaal 50 zoekresultaten beoordeeld; alleen vaste prijzen en bekende afstanden. Werking is niet geverifieerd.'};
}
