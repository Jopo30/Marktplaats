# Marktplaats Dealhunter — koppeling (ontwerp)

Status: lokale proef met handmatig zoeken via de website-zoekinterface. Het dashboard toont echte resultaten na een zoekopdracht. Nog niet op Render gepubliceerd. Zie README.md voor starten en beperkingen. Onderstaand ontwerp voor automatische monitoring, database, waardebepaling en Telegram blijft toekomstig werk.

## Zoekinstellingen
- Start: Makita, DeWalt, Milwaukee; later Gaming en Camera.
- Middelpunt: Harlingen (voor officiële API is een volledige postcode nodig).
- Radius: 100 km = 100000 meter.
- Max. aankoopprijs: €250.
- Minimale geschatte nettowinst: €50.
- Kostenreserve: €25 (instelbaar).
- Zoekinterval: iedere 5 minuten, **alleen als databron dit toestaat**.

## Bron en toestemming
Officiële API-documentatie: https://api.marktplaats.nl/docs/v2/search-advertisements.html
Endpoint GET /v2/search; gedocumenteerde filters: query, postCode, distance, limit en overige zoekvelden. API-toegang, authenticatie, rate limits en gebruiksvoorwaarden moeten worden bevestigd voordat live requests worden ingeschakeld. Geen omzeiling van toegangsbeperkingen.

## Datastroom
1. Geautoriseerde server-side zoekopdracht per zoekprofiel.
2. Normaliseer: advertentie-ID, titel, prijs, link, plaats, datum, verkoper, beschrijving, merk/model.
3. Dedupliceer op advertentie-ID en bewaar eerder geziene advertenties.
4. Bepaal tweedehandswaarde met vergelijkbare verkopen; indien geen betrouwbare bron: status 'onvoldoende prijsdata', **geen winstclaim**.
5. Bereken geschatte winst = verwachte verkoopprijs - aankoopprijs - transport/verzending - overige kosten.
6. Filter op budget, radius, marge en risico-indicatoren; stuur alleen nieuwe kwalificerende resultaten naar Telegram.
7. Dashboard leest servergegevens via een beveiligde API. Telegram-bottoken alleen als secret op server, nooit in GitHub/frontend.

## Nog te realiseren
- API-toegang en voorwaarden verifiëren.
- Backend + database + scheduler in aparte Render-service (niet de statische website).
- Betrouwbare referentieprijzen en modelherkenning.
- Telegram-bot koppelen met geheim token via Render environment secret.
- Live integratietests en monitoring.

Bestaande tradingservices en repositories blijven buiten scope.

