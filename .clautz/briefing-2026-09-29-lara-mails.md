# Arbeitsübergabe: Laras Anmerkungen (Mails vom 16.09.2026, weitergeleitet von Annemarie am 25.09.2026)

Interne Datei. Liegt in `.clautz/` und wird von GitHub Pages (Jekyll) nicht ausgeliefert. Nichts hieraus wörtlich als Besuchertext übernehmen.

## Auswertung der fünf Mails

### 1. „Website Sonnenhof der Koboldtiere“
- Lara findet den Entwurf schön. Der WDR dreht eine Reportage für „Tiere suchen ein Zuhause“; die Seite soll danach auffindbar sein (SEO/Meta-Angaben prüfen).
- Text aus den zwei Infoflyern übernehmen (Flyertext unten).
- **Fotografinnen müssen immer genannt werden, wenn kein Logo im Foto ist.**
- Medienlinks (ZEIT, SR-Mediathek Radio mit Pepe, ARD Mediathek Aktueller Bericht): **bereits umgesetzt** im Abschnitt „Der Sonnenhof in den Medien“.

### 2. „Korrektur Homepage“ (bezieht sich auf die frühere Little-Bee-Karte)
- Das damalige Little-Bee-Foto gehört dpa, also nicht verwenden. Ersatz, Laras eigenes Foto: `assets/img/sonnenhof/little-bee-mit-lara.jpg` (Little Bee im Korbsessel, Lara krault sie).
- Gewünschter Text: „wurde als Kitten querschnittsgelähmt ausgesetzt“.
- Fehler: Unten stand „Hund mit besonderem Pflegebedarf“, Little Bee ist eine **Katze**.
- Flyer: Little Bee, geb. 10.2020, querschnittsgelähmt ausgesetzt.
- **Folgefehler im aktuellen Stand:** Dieser Satz ist fälschlich bei **Murron** gelandet (Story-Absatz `#geschichte` und Murron-Karte in `#tiere`). Murron wurde NICHT ausgesetzt, sondern auf einer Mülldeponie gefunden (siehe Punkt 4). Beides korrigieren und Little Bee als eigene Tierkarte wieder aufnehmen.

### 3. „Hofbewohner Njuvra“
- „Ältester Lebenshofbewohner, geb. 14.02.2015, bei mir seit Oktober 2015, verdrehtes Hinterbein nach Unfall als Kitten, Kroate.“
- Foto ist schon eingebaut (`njuvra-portraet.jpg`). Text weitgehend umgesetzt; „ältester Bewohner des Hofes“ ergänzen. Njuvra ist ein Kater (Kroate); Pronomen im Text prüfen.

### 4. „Murron“
- Erste querschnittsgelähmte Katze, geb. 13.06.2017, seit Juli 2017 bei Lara. **Auf einer Mülldeponie gefunden**: entweder entsorgt, weil sie querschnittsgelähmt war, oder als ungewollter Nachwuchs entsorgt und durch Quetschungen im Müll querschnittsgelähmt. Murron ist die Oberbossin des Vereins und liebt Abenteuer mit ihrem Hunderudel und Urlaube.
- Foto ist schon eingebaut (`murron-am-meer.jpg`). Die Originale von Murron (3 MB) und Njuvra (1,2 MB) sind nicht fürs Web verkleinert; auf max. 1600 px verkleinern wäre sinnvoll (ffmpeg ist in der Cloud ggf. nicht da, dann weglassen).

### 5. „Link Fotoshootings“
- Aus den mondpixel-Shootings sind nur Pavel (schwarz-weißer Kater) und Hunter (kleiner schwarzer Russischer Toy Terrier) interessant. Bei den Hunden aus dem Shooting von Elena Reckel ist nur noch Pepe aktuell.
- **Mercy ist verstorben. Hedda steht kurz davor, erlöst zu werden.** Beide nicht als lebende Hofbewohner darstellen; derzeit tauchen sie auf der Seite nicht auf. Das so lassen.
- Pepe ist auf den Elena-Reckel-Fotos nicht sicher zu identifizieren, deshalb kein Pepe-Foto. Nicht raten.

## Neue Bilddateien (bereits in `assets/img/sonnenhof/`, max. 1600 px)

| Datei | Motiv | Pflichtnachweis |
|---|---|---|
| `little-bee-mit-lara.jpg` | Little Bee (Katze) im Korbsessel, Lara krault sie | Foto von Lara, kein Nachweis nötig |
| `mondpixel-pavel.jpg` | Pavel, schwarz-weißer Kater, auf braunem Sofa | „Foto: Mondpixel“ (kein Logo im Bild) |
| `mondpixel-hunter.jpg` | Hunter, kleiner schwarzer Russischer Toy Terrier, Hochformat | „Foto: Mondpixel“ |
| `elenareckel-lara-mit-katze.jpg` | Lara hält eine schwarz-weiße Katze, Hochformat | „Foto: Elena Reckel“ |
| `seelenheil-lara-mit-hunden-im-schnee.jpg` | Lara mit vier Hunden (drei im Rolli) im Schnee | Logo „Seelenheil Photographie“ im Bild, Nachweis trotzdem schön |

Bestehende Seelenheil-Bilder: Das Logo ist im Bild, der vorhandene Nachweis bleibt.

## Umsetzungsauftrag
1. Murron-Texte korrigieren (Story + Karte): Mülldeponie statt „ausgesetzt“.
2. Little Bee als Tierkarte ergänzen: Katze, geb. Oktober 2020, als Kitten querschnittsgelähmt ausgesetzt, Foto `little-bee-mit-lara.jpg`.
3. Pavel und Hunter als Tierkarten ergänzen (Fotos + Fotonachweis Mondpixel). Weitere Fakten zu beiden sind nicht bekannt; nichts erfinden, lieber knapp.
4. Njuvra: „ältester Bewohner“ ergänzen.
5. Flyertext sinnvoll einarbeiten, vor allem Geschichte (Kroatien 2015, Uni-Gelände Saarbrücken seit 2017, Spezialisierung auf Tiere mit Behinderung, Haus in Heusweiler seit Sommer 2024 mit knapp 2000 m² Grundstück). Spendenkonto/PayPal mit dem vorhandenen Abschnitt abgleichen.
6. Das Foto von Lara (Elena Reckel oder Seelenheil-Gruppenbild) dort einsetzen, wo es trägt, z. B. bei der Geschichte.
7. Jede Bildunterschrift mit Fotografin, wo kein Logo im Bild ist.
8. Meta-Description / Title prüfen, damit der Sonnenhof nach der WDR-Sendung gefunden wird („Sonnenhof der Koboldtiere“, „Lebenshof“, „Heusweiler“, „Tiere mit Handicap“).
9. Projektregeln: echte Umlaute, Duden, keine Em-Dashes, Halbgeviertstrich mit Leerzeichen. Keine internen Sätze in sichtbarer Copy. Keine Mercy/Hedda als lebende Tiere.

## Flyertext 1 (Infoflyer Verein Heusweiler)
Katzenstimme grenzenlos e.V.

Unser saarländischer Verein mit Sitz in Heusweiler setzt sich für Katzen in Not ein.

Bei einem Urlaub in Südkroatien im Oktober 2015 fielen mir die vielen kranken Straßenkatzen
auf und da es in dieser Region kein Tierheim, noch sonstige Tierschutzeinrichtung gab, startete
ich meine Tierschutzarbeit dort. Über die Jahre kamen deutsche Hilferufe über Hunde und
Katzen in Messihaushalten oder in Notsituationen hinzu.
So haben wir uns unter anderem seit 2017 erfolgreich um die vielen Straßenkatzen auf dem
Universitätsgelände in Saarbrücken gekümmert, und über dreißig Katzen kastriert, gesund
gepflegt und geimpft. Diese leben jetzt in einem sicheren, wohlbehüteten Zuhause.
Die eigentliche Arbeit für Katzen habe ich aus dem Grund begonnen, weil Straßenhunde meist
mehr Hilfe und Unterstützung erfahren als Straßenkatzen. Aber auch die werden krank,
verunfallen, haben Hunger und benötigen als domestizierte Haustiere dringend menschliche
Hilfe. Jährlich fahren wir deswegen nach Südkroatien, um Straßenkatzen für Kastrationen an
unseren Futterstellen zu sichern.
Trotz unserer eigentlichen Spezialisierung auf Katzen sehen wir jedes Jahr auch immer wieder
Notfallhunde, die unsere Hilfe benötigen und diese
dann auch bekommen.

Mit den Jahren spezialisierten wir uns immer mehr auf
Tiere mit Behinderung, weil es am Ende leider gilt,
Prioritäten zu setzen, da nie alle gerettet werden
können. Unsere Vermittlungskatzen kommen also
meist mit körperlichen Einschränkungen in unseren
Verein. Unsere Hilfe gilt bevorzugt den Handicats, die
z.B. blind sind, nur ein Auge oder nur drei Beine
haben.
Da meine Arbeit bekannt wurde, wurde ich im Laufe der Zeit auch bei pflegeintensiveren Fällen
um Hilfe gebeten, bevor das Tier eingeschläfert werden würde, ,,weil es zu viel Arbeit macht".

In den letzten Jahren gründete ich somit einen kleinen Lebenshof, auf dem fünf Rollihunde und
zehn Katzen mit Behinderung ihren sicheren Hafen fanden. Im Sommer 2024 konnten wir dann
auch endlich ein behindertengerechtes Wohnhaus mit knapp 2000qm eingezäuntem Grundstück
in Heusweiler für unsere besonderen Tiere finden.

Außerdem sind in unserem Vereinsteam weitere Tiere untergebracht, die ohne unsere Hilfe nach
ihrem Unfall auf der Straße nicht mehr am Leben wären ­ wie die Windelkatzen Lussi aus der
Ukraine und der Windel tragende Kater Dragi sowie die querschnittsgelähmte Katze Soula
(beide aus Kroatien).
Wir nehmen im Team auch chronisch kranke Tiere auf, die nicht mehr
vermittelbar sind, aber noch einen schönen Lebensabend nach einem
harten Leben verdient haben. Auch wenn wir immer wieder schlimme
Schicksale begleiten und leider nicht allen ein langes, erfülltes Leben in
einer Familie ermöglichen können, was unser großes Ziel ist, so können
wir den Tieren, die keiner mehr will und die gesundheitlich sehr schlechte
Chancen haben, Liebe und Fürsorge schenken.
Wir geben mit den Tierärzten und Fachkräften hier in Deutschland und im
Ausland immer unser Bestes. Final einen Lebenshof zu gründen war ein
großer Traum, der verwirklicht werden konnte.
Wenn man seine Berufung leben kann, ist es ein Geschenk!

(rechtes Foto: Klein My, geb. 05.2019, querschnittsgelähmt nach Unfall als ausgesetztes Kitten ­
Mychen liebt Musik)

                                                                                  Denn Liebe und Mitgefühl
                                                                                  sollten immer unser Antrieb
                                                                                  sein. Jeder hat die Möglichkeit,
                                                                                  ein bisschen die Welt zu
                                                                                  verändern.

                                                                                  ,,Viele kleine Leute, die an
                                                                                  vielen kleinen Orten viele kleine
                                                                                  Dinge tun, können das Gesicht
                                                                                  der Welt verändern. "
                                                                                  (afrikanisches Sprichwort)

Unser Verein ist unter anderem auf Facebook zu finden unter ,,Katzenstimme grenzenlos" sowie
auf Instagram ,,katzenstimme_grenzenlos". Auf Instagram gibt es täglich auch Auszüge aus dem
Alltag des Lebenshofs zu sehen beim ,,sonnenhof_der_koboldtiere".

Spendenkonto:
Katzenstimme grenzenlos e.V.
DE09 5919 0000 0118 0940 00
BIC: SABADE5SXXX
Bank 1 Saar eG

PayPal: www.paypal.me/katzenstimme

11.06.2025, Vereinsvorsitzende: Lara Sohn
Rutschikater Mercy, geb. 05.2021, als Kitten ausgesetzt      Rollihündin Lemon, geb. 09.2018, verunfallte als Straßenhündin

Elif, geb. 06.2024, verunfallte an der Front in der Ukraine  Snow, geb. 05.2023, wurde querschnittsgelähmt ausgesetzt

Liesel, geb. 02.2019, verunfallte in der Ukraine             Little Bee, geb. 10.2020, querschnittsgelähmt ausgesetzt

Hedda, schleuderte bei einem Bombenangriff aus dem Fenster Ivy, geb. 10.2023, dt. Notfall mit unterlassener Hilfeleistung

## Flyertext 2 (Faltflyer, nur Bildbeschriftungen)
Tyra & Snow

                                            Maila

Klein        Elif    Hedda
My

                     Little Bee             Njuvra
                     Vereinsvorsitzende
Miran        Mumin   Lara Sohn mit einigen
             Pepe    Hunden vom Sonnenhof
Pavel        Liesel  der Koboldtiere
Lemon        Hunter

Ivy
Fiedel Fröhlich
                                  Elif & Murron
