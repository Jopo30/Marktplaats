const form=document.querySelector('#search'),status=document.querySelector('#status'),results=document.querySelector('#results'),button=document.querySelector('#submit');
const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(value);
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
      body:JSON.stringify({query:document.querySelector('#query').value,postcode:document.querySelector('#postcode').value,maxPrice:Number(document.querySelector('#budget').value)}),signal:AbortSignal.timeout(20000)});
    const data=await response.json();
    if(response.status===401){showSession(false);loginStatus.textContent='Je sessie is verlopen. Log opnieuw in.';}
    if(!response.ok)throw new Error(data.error || 'Ophalen mislukt.');
    status.textContent=(data.cached?'Bewaarde resultaten':'Opgehaald')+': '+new Date(data.fetchedAt).toLocaleString('nl-NL')+'. '+data.note;
    document.querySelector('#count').textContent='('+data.listings.length+')';
    if(!data.listings.length)status.textContent+=' Geen passende advertenties binnen de bekeken resultaten.';
    for(const item of data.listings){
      const article=document.createElement('article'),title=document.createElement('h3'),info=document.createElement('p'),description=document.createElement('p'),assessment=document.createElement('p'),link=document.createElement('a');
      title.textContent=item.title;info.textContent=euro(item.price)+' · '+item.city+' · '+item.distanceKm.toFixed(1)+' km';
      description.textContent=item.description;assessment.textContent=item.assessment+'. '+item.valuation+'.';
      link.textContent='Bekijk op Marktplaats';link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
      article.append(title,info,description,assessment,link);results.append(article);
    }
  }catch(error){status.dataset.error='true';status.textContent='Geen actuele resultaten: '+error.message;}
  finally{button.disabled=false;}
});
