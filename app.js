const form=document.querySelector('#search'),status=document.querySelector('#status'),results=document.querySelector('#results'),button=document.querySelector('#submit');
const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(value);
const category=document.querySelector('#category'),subcategory=document.querySelector('#subcategory');
let categories=[];
fetch('/categories.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  categories=data.categories;
  for(const item of categories)category.add(new Option(item.name,item.id));
  category.disabled=false;
}).catch(()=>{document.querySelector('#category-status').textContent='Categorieën laden mislukt. Vernieuw de pagina of zoek op zoekterm.';});
category.addEventListener('change',()=>{
  subcategory.replaceChildren(new Option('Alle subcategorieën','0'));
  const selected=categories.find(c=>String(c.id)===category.value);
  for(const item of selected?.children || [])subcategory.add(new Option(item.name,item.id));
  subcategory.disabled=!selected;
});
const login=document.querySelector('#login'),dashboard=document.querySelector('#dashboard'),loginStatus=document.querySelector('#login-status');
function showSession(authenticated){
  login.hidden=authenticated;dashboard.hidden=!authenticated;
  if(!authenticated){results.replaceChildren();document.querySelector('#count').textContent='';status.textContent='Nog niet gezocht.';}
}
fetch('/api/session').then(r=>r.json()).then(d=>showSession(d.authenticated)).catch(()=>{loginStatus.textContent='Verbinding mislukt. Vernieuw de pagina.';});
document.querySelector('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const submit=document.querySelector('#login-submit'),password=document.querySelector('#password');
  submit.disabled=true;loginStatus.textContent='Inloggen…';
  try{
    const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:password.value,remember:document.querySelector('#remember').checked})});
    const data=await response.json();if(!response.ok)throw new Error(data.error);
    password.value='';loginStatus.textContent='';showSession(true);
  }catch(error){loginStatus.textContent=error.message;}finally{submit.disabled=false;}
});
document.querySelector('#logout').addEventListener('click',async()=>{
  try{
    const response=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    if(!response.ok)throw new Error('Uitloggen mislukt.');
    showSession(false);loginStatus.textContent='Je bent uitgelogd.';
  }catch(error){status.textContent=error.message;}
});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
form.addEventListener('submit',async event=>{
  event.preventDefault();button.disabled=true;results.replaceChildren();document.querySelector('#count').textContent='';
  status.dataset.error='false';status.textContent='Advertenties ophalen…';
  try {
    const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({query:document.querySelector('#query').value,categoryId:Number(category.value),subcategoryId:Number(subcategory.value),postcode:document.querySelector('#postcode').value,maxPrice:Number(document.querySelector('#budget').value)}),signal:AbortSignal.timeout(20000)});
    const data=await response.json();
    if(response.status===401){showSession(false);loginStatus.textContent='Je sessie is verlopen. Log opnieuw in.';}
    if(!response.ok)throw new Error(data.error || 'Ophalen mislukt.');
    status.textContent=(data.cached?'Bewaarde resultaten':'Opgehaald')+': '+new Date(data.fetchedAt).toLocaleString('nl-NL')+'. '+data.note;
    document.querySelector('#count').textContent='('+data.listings.length+')';
    if(!data.listings.length)status.textContent+=' Geen passende advertenties binnen de bekeken resultaten.';
    for(const item of data.listings){
      const article=document.createElement('article'),title=document.createElement('h3'),info=document.createElement('p'),description=document.createElement('p'),assessment=document.createElement('p'),link=document.createElement('a');
      title.textContent=item.title;info.textContent='Vraagprijs: '+euro(item.price)+' · '+item.city+' · '+item.distanceKm.toFixed(1)+' km';
      const prices=document.createElement('div');prices.className='price-comparison';
      const price=document.createElement('strong'),detail=document.createElement('p'),ref=item.newPrice;
      if(ref?.amount != null){
        price.textContent='Indicatieve nieuwprijs: '+euro(ref.amount);
        detail.textContent=(ref.difference>=0?'Vraagprijs '+euro(ref.difference)+' ('+ref.percentage+'%) lager dan nieuw.':'Vraagprijs '+euro(-ref.difference)+' hoger dan nieuw.')+' Geen winstschatting.';
        const source=document.createElement('a');source.href=ref.url;source.target='_blank';source.rel='noopener noreferrer';
        source.textContent=ref.shop+' · Makita '+ref.sku+' · bron bekijken';
        const note=document.createElement('p');note.className='price-note';
        note.textContent=ref.variant+'. Incl. btw, excl. eventuele verzendkosten. Referentie geraadpleegd '+ref.checkedAt+'; geen live prijs of gegarandeerde laagste prijs. Controleer de meegeleverde onderdelen.';
        prices.append(price,detail,source,note);
      }else{
        price.textContent='Nieuwprijs onbekend';
        detail.textContent=ref?.reason || 'Geen gecontroleerde prijsreferentie beschikbaar.';
        const lookup=document.createElement('a');lookup.href='https://www.google.com/search?q='+encodeURIComponent(item.title+' nieuw kopen prijs');lookup.target='_blank';lookup.rel='noopener noreferrer';lookup.textContent='Zoek zelf de nieuwprijs';
        prices.append(price,detail,lookup);
      }
      description.textContent=item.description;assessment.textContent=item.assessment+'. '+item.valuation+'.';
      link.textContent='Bekijk op Marktplaats';link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
      article.append(title,info,prices,description,assessment,link);results.append(article);
    }
  }catch(error){status.dataset.error='true';status.textContent='Geen actuele resultaten: '+error.message;}
  finally{button.disabled=false;}
});
