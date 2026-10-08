# spielregeln Specification

## Purpose
Legt die Spielregeln von Doppelkopf fest, nach denen der Server Züge prüft: Kartensatz, Geben, Vorbehalte, Trumpf- und Fehlreihenfolgen, Bedienpflicht, Stichvergabe und Parteien.

## Requirements

### Requirement: Kartensatz und Geben
Das Spiel SHALL mit 48 Karten (je zweimal 9, 10, Bube, Dame, König, Ass in Kreuz, Pik, Herz, Karo) gespielt werden, oder – wenn beim Anlegen „ohne Neunen“ gewählt wurde – mit 40 Karten ohne die Neunen. Der Server SHALL zufällig mischen und reihum gleich viele Karten an die vier Spieler geben (12 bzw. 10). Der Geber SHALL von Runde zu Runde im Uhrzeigersinn wechseln; der Spieler links vom Geber SHALL die Vorbehaltsabfrage und – außer im Solo, wo der Solist herauskommt – den ersten Stich eröffnen.

#### Scenario: Geben mit Neunen
- **WHEN** eine Runde mit 48 Karten beginnt
- **THEN** hält jeder Spieler 12 Karten und jede Karte existiert genau zweimal

#### Scenario: Geben ohne Neunen
- **WHEN** eine Runde einer Partie „ohne Neunen“ beginnt
- **THEN** hält jeder Spieler 10 Karten und keine Neun ist im Spiel

#### Scenario: Geberwechsel
- **WHEN** Runde n mit Geber Platz g endet
- **THEN** gibt in Runde n+1 Platz (g+1) mod 4

### Requirement: Augenwerte
Die Karten SHALL folgende Augen zählen: Ass 11, Zehn 10, König 4, Dame 3, Bube 2, Neun 0. Alle Karten zusammen SHALL 240 Augen ergeben.

#### Scenario: Summe der Augen
- **WHEN** alle Stiche einer Runde gezählt werden
- **THEN** ergeben die Augen beider Parteien zusammen 240

### Requirement: Trumpf im Normalspiel
Im Normalspiel und in der Hochzeit SHALL Trumpf in absteigender Reihenfolge sein: Herz-Zehn (Dulle), Kreuz-Dame, Pik-Dame, Herz-Dame, Karo-Dame, Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube, Karo-Ass, Karo-Zehn, Karo-König, Karo-Neun. Fehlfarben SHALL Kreuz und Pik (Ass, Zehn, König, Neun) sowie Herz (Ass, König, Neun) sein.

#### Scenario: Dulle schlägt Kreuz-Dame
- **WHEN** in einem Stich Kreuz-Dame und danach Herz-Zehn gespielt werden
- **THEN** gewinnt die Herz-Zehn den Stich

### Requirement: Trumpf in Solos
In Solos SHALL Trumpf wie folgt sein:
- Damensolo: nur die Damen (Kreuz, Pik, Herz, Karo); alle anderen Karten sind Fehl in ihrer Farbe mit der Reihenfolge Ass, Zehn, König, Bube, Neun.
- Bubensolo: nur die Buben analog.
- Fleischloser: kein Trumpf; jede Farbe Ass, Zehn, König, Dame, Bube, Neun.
- Farbsolo Karo: wie Normalspiel.
- Farbsolo Kreuz/Pik/Herz: Herz-Zehn, Damen, Buben (wie Normalspiel), danach Ass, Zehn, König, Neun der Solofarbe; Karo wird Fehlfarbe. Im Herz-Solo ist die Herz-Zehn die Dulle und gehört nicht zusätzlich zur Herz-Folge.

#### Scenario: Damensolo
- **WHEN** im Damensolo Pik-Bube und Kreuz-Neun in einem Kreuz-Stich liegen
- **THEN** sind beide keine Trümpfe und Pik-Bube gilt als Pik-Fehlkarte

#### Scenario: Kreuz-Solo
- **WHEN** im Kreuz-Solo jemand Karo-Ass auf einen Kreuz-Neun-Anspiel legt, weil er kein Kreuz hat
- **THEN** ist Karo-Ass kein Trumpf und die Kreuz-Neun gewinnt

### Requirement: Bedienpflicht
Ein Spieler SHALL die angespielte Farbe bedienen (Trumpf gilt als eigene Farbe), wenn er kann. Kann er nicht bedienen, SHALL er jede Karte spielen dürfen. Ungültige Karten SHALL der Server ablehnen.

#### Scenario: Bedienen erzwungen
- **WHEN** Pik angespielt wird und der Spieler eine Pik-Fehlkarte hält
- **THEN** lehnt der Server jede andere Karte ab

#### Scenario: Abwerfen erlaubt
- **WHEN** Pik angespielt wird und der Spieler keine Pik-Fehlkarte hält
- **THEN** darf er Trumpf oder eine andere Fehlfarbe spielen

### Requirement: Stichvergabe
Den Stich SHALL die höchste Trumpfkarte gewinnen; liegt kein Trumpf, die höchste Karte der angespielten Farbe. Bei zwei gleichen Karten SHALL die zuerst gespielte gewinnen, ausgenommen die Dulle: die zweite Herz-Zehn SHALL die erste schlagen, sofern Herz-Zehn Trumpf ist. Der Stichgewinner SHALL den nächsten Stich eröffnen.

#### Scenario: Gleiche Karten
- **WHEN** zwei Kreuz-Damen in einem Stich liegen und keine Dulle
- **THEN** gewinnt die zuerst gespielte Kreuz-Dame

#### Scenario: Zweite Dulle
- **WHEN** beide Herz-Zehnen im Normalspiel in einem Stich liegen
- **THEN** gewinnt die zweite Herz-Zehn

### Requirement: Vorbehalte
Vor dem ersten Stich SHALL jeder Spieler reihum, beginnend links vom Geber, „gesund“ oder einen Vorbehalt erklären. Möglich SHALL sein: Hochzeit (nur mit beiden Kreuz-Damen), Damensolo, Bubensolo, Fleischloser, Farbsolo (Karo, Herz, Pik, Kreuz). Ein Solo SHALL Vorrang vor einer Hochzeit haben; unter mehreren Solos SHALL das des zuerst gefragten Spielers gelten. Für die Mitspieler SHALL bis zur Auflösung nur „Vorbehalt“ sichtbar sein; danach SHALL die gespielte Spielart allen angezeigt werden. Erklären alle „gesund“, SHALL ein Normalspiel stattfinden.

#### Scenario: Solo schlägt Hochzeit
- **WHEN** Platz 1 eine Hochzeit und Platz 2 ein Damensolo anmeldet
- **THEN** wird ein Damensolo von Platz 2 gespielt

#### Scenario: Hochzeit ohne Kreuz-Damen
- **WHEN** ein Spieler ohne beide Kreuz-Damen Hochzeit anmelden will
- **THEN** lehnt der Server den Vorbehalt ab

#### Scenario: Solo-Ausspiel
- **WHEN** ein Solo gespielt wird
- **THEN** eröffnet der Solist den ersten Stich

### Requirement: Parteien
Im Normalspiel SHALL die Re-Partei aus den Haltern der Kreuz-Damen bestehen, die Kontra-Partei aus den übrigen. Hält ein Spieler im Normalspiel beide Kreuz-Damen und hat „gesund“ erklärt (stille Hochzeit), SHALL er allein Re sein und wie ein Solist abgerechnet werden. Im Solo SHALL der Solist allein Re sein. In der Hochzeit SHALL der Gewinner des ersten der ersten drei Stiche, den nicht der Hochzeiter macht (Klärungsstich), sein Partner werden; macht der Hochzeiter die ersten drei Stiche selbst, SHALL er allein Re spielen und wie ein Solist abgerechnet werden.

#### Scenario: Hochzeit geklärt
- **WHEN** in einer Hochzeit Platz 3 den zweiten Stich gewinnt und der Hochzeiter den ersten gewonnen hat
- **THEN** ist Platz 3 Partner des Hochzeiters und Re

#### Scenario: Hochzeit ohne Partner
- **WHEN** der Hochzeiter die ersten drei Stiche gewinnt
- **THEN** spielt er allein Re gegen drei Kontra-Spieler
