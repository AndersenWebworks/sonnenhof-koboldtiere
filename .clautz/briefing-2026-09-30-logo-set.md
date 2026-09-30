# Auftrag für Codex: Logo-Set Sonnenhof der Koboldtiere

Interne Datei. Liegt in `.clautz/` und wird von GitHub Pages nicht ausgeliefert.

## Ziel
Aus dem gewählten Logo (Sonne hinter Hund, Katze und Hase auf dunkelgrünem Kreis) ein sauberes, vektorbasiertes Logo-Set bauen, das von groß bis Favicon funktioniert. Danach alte Logo-Dateien entfernen und alle Seiten auf das neue Set umstellen.

## Ist-Zustand (geprüft am 30.09.2026)

| Datei | Zustand | Verwendet in |
|---|---|---|
| `assets/img/sonnenhof-logo.png` | 1254 × 1254 px, **1,15 MB**. Die gewählte Gestaltung, aber **defekt**: Im grünen Kreis sind oben und unten verwaschene, verpixelte Löcher im Alphakanal (vermutlich wegradierter Ringtext). Rund 44 % der Kreisfläche sind teiltransparent. Auf dem dunkelgrünen Header fällt das kaum auf, auf hellem Grund sieht man weiße Flecken. | Header und Footer in `index.html`, `sonnenhof-impressum.html`, `sonnenhof-datenschutz.html` (angezeigt mit 36 bis 48 px) |
| `favicon.svg` | Eigenständige, **andere** Zeichnung (Tiere anders geformt, andere Grüntöne `#073b29`/`#f4b834`) | `<link rel="icon">` in allen drei Seiten, `?v=20260926` |
| `assets/img/sonnenhof-mark.svg` | Dritte, ältere Zeichnung der Bildmarke | nirgends |
| `assets/img/sonnenhof-logo-compact.svg` | Bindet `sonnenhof-mark.svg` per `<image>` ein, Schrift als `<text>` (fontabhängig) | nirgends |
| `assets/img/sonnenhof-logo-horizontal.svg` | wie oben, quer | nirgends |

Es gibt also drei verschiedene Fassungen der Bildmarke, und die tatsächlich genutzte ist ein zu großes, beschädigtes PNG.

Zusätzlich fehlen: `apple-touch-icon`, PNG-Favicons, `favicon.ico`, Web-Manifest, ein Open-Graph-taugliches Logo.

## Gestaltungsvorgaben
- Vorlage ist die Gestaltung aus `sonnenhof-logo.png`: dunkelgrüner Kreis, gelbe Sonne mittig oben, davor von links Hund (Schlappohren), Katze, Hase (lange Ohren), cremefarben, mit schlichten Gesichtern. **Motiv nicht neu erfinden**, sondern sauber nachzeichnen.
- Die Löcher/Flecken fallen weg: Kreis vollflächig grün.
- Farben aus der Website (`:root` in `index.html`): Grün `#173f32` (bzw. `#123b2d`), Sonne `#f5c95b`, Creme `#fffdf8`, Gesichtszüge im Grün. Keine weiteren Farben.
- Schrift im Schriftzug: Georgia-Anmutung wie auf der Seite. In den SVG-Dateien die Schrift **in Pfade umwandeln**, keine `<text>`-Elemente, keine eingebundenen Fremddateien per `<image>`.
- Für kleine Größen (16 und 32 px) eine **vereinfachte Favicon-Fassung**: keine Schnurrhaare, keine feinen Linien, Tiere etwas größer im Kreis, damit man sie auf 16 px noch erkennt.
- Sauberes SVG: `viewBox`, keine festen `width`/`height`, `<title>`, keine Editor-Metadaten, optimiert (z. B. mit svgo).

## Gewünschtes Set
Ordner `assets/img/logo/`:

| Datei | Inhalt |
|---|---|
| `sonnenhof-bildmarke.svg` | Bildmarke, volle Detailstufe (Master) |
| `sonnenhof-bildmarke-klein.svg` | vereinfachte Bildmarke für Favicon und sehr kleine Größen |
| `sonnenhof-logo-quer.svg` | Bildmarke links, Schriftzug „Sonnenhof der Koboldtiere“ rechts, für hellen Grund |
| `sonnenhof-logo-quer-hell.svg` | wie oben, Schrift in Creme für dunklen Grund |
| `sonnenhof-logo-hoch.svg` | Bildmarke oben, Schriftzug darunter |
| `sonnenhof-bildmarke-512.png`, `-192.png`, `-96.png` | Rastergrößen aus dem Master (transparent außerhalb des Kreises) |
| `sonnenhof-social.png` | 1200 × 630 px, Logo quer auf Creme, für Vorschauen in sozialen Netzwerken |

Im Wurzelverzeichnis (wo Browser suchen):

| Datei | Inhalt |
|---|---|
| `favicon.svg` | aus `sonnenhof-bildmarke-klein.svg` |
| `favicon.ico` | 16, 32 und 48 px, aus der kleinen Fassung |
| `favicon-32.png`, `favicon-16.png` | aus der kleinen Fassung |
| `apple-touch-icon.png` | 180 × 180 px, **vollflächig** (kein transparenter Rand, iOS rundet selbst ab) |
| `site.webmanifest` | Name „Sonnenhof der Koboldtiere“, Kurzname „Sonnenhof“, `theme_color` `#173f32`, `background_color` `#f8f4eb`, Icons 192 und 512 |

PNG-Dateien verlustfrei komprimieren (z. B. oxipng). Kein PNG über 100 KB außer dem Social-Bild.

## Einbau
In `index.html`, `sonnenhof-impressum.html` und `sonnenhof-datenschutz.html`:
- Header und Footer: `assets/img/sonnenhof-logo.png` durch `assets/img/logo/sonnenhof-bildmarke.svg` ersetzen (Größen und Klassen bleiben).
- Im `<head>` den Favicon-Block ersetzen durch:
  ```html
  <link rel="icon" href="favicon.ico" sizes="48x48">
  <link rel="icon" href="favicon.svg?v=20260930" type="image/svg+xml">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  ```
- In `index.html` kann `og:image` auf dem Gruppenfoto bleiben (zeigt die Tiere). Im JSON-LD zusätzlich das Logo eintragen: `"logo": "https://sonnenhof-der-koboldtiere.de/assets/img/logo/sonnenhof-bildmarke-512.png"`.

## Bereinigen
Nach dem Einbau löschen: `assets/img/sonnenhof-logo.png`, `assets/img/sonnenhof-mark.svg`, `assets/img/sonnenhof-logo-compact.svg`, `assets/img/sonnenhof-logo-horizontal.svg`.
Vorher mit `grep -rn` prüfen, dass außerhalb von `backup/` nichts mehr darauf verweist. `backup/` nicht anfassen.

## Abnahme
- Header, Footer und beide Unterseiten im Browser prüfen, auf hellem und dunklem Grund.
- Favicon im Browser-Tab bei 16 px erkennbar (drei Tiere, Sonne).
- Keine toten Bildpfade (Browser-Konsole, Netzwerk-Tab).
- Projektregeln: echte Umlaute, keine Em-Dashes, keine internen Sätze in sichtbarer Copy.
- Erst auf einem Arbeitszweig committen. `master` geht sofort live, vor dem Merge Erik fragen.
