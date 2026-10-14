# 3D-paskamer

Zie in 3D hoe de kleding uit je webshop-winkelmand je staat.

* **Avatar op jouw maten** – lengte, schouders, borst, taille, heupen, huid en haar; stel zelf in of kies Man / Vrouw / Neutraal.
* **Winkelmand importeren** – een bladwijzer (bookmarklet) leest de winkelmand van elke webshop uit en stuurt de items naar deze app. Handmatig toevoegen (naam + afbeeldings-URL) en JSON plakken kan ook.
* **Kleding in 3D** – T-shirt, longsleeve, overhemd, blouse, trui, hoodie, bodywarmer, jas, blazer, mantel, jeans, broek, legging, korte broek, rok, jurk en schoenen; soort, kleur en patroon (effen / gestreept / geruit) worden uit de productnaam geraden en zijn aan te passen.
* **Maat & pasvorm** – kies de maat van het item; de app vergelijkt met jouw maten (“Strak”, “Past precies”, “Ruim”) en past de 3D-pasvorm aan.
* **Outfit combineren** – lagen (shirt + jas), geen dubbele items in dezelfde slot, totaalprijs, draaien, zij/achterkant en foto opslaan.

## Starten

```bash
npm install
npm run dev      # ontwikkelen op http://localhost:5173
npm run build    # statische site in dist/ (overal te hosten)
npm test
```

## Winkelmand importeren

1. Open de app, tabblad **Importeren**, sleep de knop *3D-paskamer* naar je bladwijzerbalk.
2. Open je winkelmand (of een productpagina) in de webshop en klik de bladwijzer.
3. Vink de items aan → *Naar 3D-paskamer*.

De gegevens reizen via de URL-hash naar de app (nooit naar een server). Je maten en mand staan alleen in de `localStorage` van je eigen browser.
Webshops met een strikte Content-Security-Policy kunnen bladwijzer-scripts blokkeren; gebruik dan handmatig toevoegen of JSON.

## Beperkingen

De avatar is een parametrisch model, geen foto-realistische scan, en de kleding is geometrisch (geen stofsimulatie of exacte maattabel van het merk). Het geeft een goede indruk van kleur, snit, lengte en ruimte, geen garantie op pasvorm. Kleur wordt uit de tekst en (indien de afbeeldingsserver CORS toestaat) uit de productfoto gehaald.

## Structuur

| Bestand | Inhoud |
|---|---|
| `src/body.js` | lichaamsmodel uit maten, lofted meshes |
| `src/garments.js`, `src/catalog.js` | kledingtypen en 3D-opbouw |
| `src/avatar.js` | lichaam + kleding + laagstapeling |
| `src/classify.js`, `src/sizing.js` | herkenning uit tekst, maten en pasvorm |
| `src/bookmarklet.raw.js` | scraper die in de webshop draait |
| `src/viewer.js`, `src/main.js` | Three.js-scène en UI |
