# Dealhunter: handmatige proef

Deze versie vervangt het demodashboard door een Node 22-server met een zoekknop.
De provider gebruikt de zoekmethode uit PonClick/marktplaats-mcp (referentiecommit
3923ab2aadef47ed2af6ee3b51a9ff3863cb250e); dit is een aangepaste zoekadapter, geen MCP-installatie.
MIT-vermelding staat in LICENSE-PonClick.

Start met `node server.mjs`. Live requests staan standaard uit:
`SEARCH_ENABLED=true` schakelt de proef in. Testen: `node --test`.
Voor hosting: `HOST=0.0.0.0`, `NODE_ENV=production` en een sterke
`DEALHUNTER_ACCESS_TOKEN` via serverinstellingen (nooit in GitHub).
Zonder token weigert productie zoekverzoeken. De browser bewaart de code niet.
PORT wordt door de host ingesteld; healthcheck is /health.

Gebruik één serverinstantie: de globale limiet en resultaatcache zitten in het geheugen
en worden bij herstart gewist. Maximaal één nieuwe zoekopdracht per vijf minuten;
identieke opdrachten binnen die tijd gebruiken de cache. Geen scheduler of retries.
Bij blokkade of fouten toont het dashboard geen oude resultaten als actueel.

Resultaten: maximaal 50 kandidaten, deduplicatie binnen een zoekopdracht,
100 km rond ingevoerde postcode, vaste positieve prijs binnen budget,
en uitsluiting van expliciete defectmeldingen. Ontbrekende prijzen/afstanden
worden uitgesloten. Advertentietekst is niet noodzakelijk volledig; werking
moet bij de verkoper worden gecontroleerd. Geen winstclaim, Telegram of database.

De bestaande Render static site kan deze server niet uitvoeren. Een aparte
webservice of expliciete migratie is nodig. Publiceer pas na beoordeling;
wijzig geen tradingservices. Officiële API kan later dezelfde providerinterface
overnemen. Beschikbaarheid van het website-endpoint geeft geen toestemming.

## Inloggen
Gebruik de bestaande dashboardtoegangscode als wachtwoord. Optioneel 30 dagen ingelogd blijven via een ondertekende HttpOnly/Secure/SameSite=Strict-cookie; anders een browser-sessie met maximaal 12 uur geldigheid. Uitloggen wist de cookie. De server bewaart geen wachtwoord in browseropslag. Een herstart behoudt geldige cookies zolang de servercode ongewijzigd blijft. Roteer DEALHUNTER_ACCESS_TOKEN om alle sessies ongeldig te maken. Maximaal tien mislukte inlogpogingen per kwartier per serverinstantie. Zoekverzoeken gebruiken voortaan de sessiecookie; Bearer-authenticatie is vervangen.
