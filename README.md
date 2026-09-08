# Le Mamichat

Un **journal interactif** de vingt-deux pages, offert à Marie-Charlotte pour ses
quatre-vingts ans. On tourne les pages à l'écran comme celles d'un quotidien
papier, on détache les bons, on remplit les mots croisés, et on l'imprime si on
veut le tenir en main.

Écrit à plusieurs mains par toute la famille. Le moteur de tourne-page, la
grille de mots croisés et la mise en page sont faits maison, sans aucune
dépendance d'exécution.

> Ce dépôt est publié pour le code et la démarche. Le contenu éditorial, les
> photographies et les archives familiales appartiennent à leurs auteurs et ne
> sont pas réutilisables.

## Direction artistique — « Grand large »

Un almanach de bord imprimé en **trois encres seulement** : orange, bleu, encre
noire, sur un papier beige. Rien n'est gris — ce qui n'est pas de l'encre est
une couleur franche.

| Rôle | Couleur | Variable |
| --- | --- | --- |
| Fond papier | `#EDE5D7` | `--paper-100` |
| Encre | `#1F1B16` | `--ink` |
| Accent primaire | `#F0692F` | `--orange` |
| Accent secondaire (complémentaire) | `#1F6FA8` | `--blue` |
| Nuit (page des astres) | `#0C2439` | `--blue-night` |

### Trois voix typographiques, jamais mélangées

- **`UnifrakturCook`** dit *le journal* : le bandeau de titre, une seule fois.
- **`Anton`** dit *les titres* : capitales condensées, hautes, droites, serrées
  jusqu'à se toucher — puis **mangées par un grain** (`--tex-erode`, un masque
  SVG anisotrope) pour que l'encre ait l'air d'avoir mal pris sur le papier.
- **`Archivo`** dit *les étiquettes* (rubriques, prix, intertitres) et
  **`Space Mono`** *les mentions techniques* (folios, légendes, relevés).

Le labeur reste en `Source Serif 4`. Un grain SVG en `mix-blend-mode: multiply`
donne le rendu « imprimé ».

> L'usure des titres est un effet d'écran : elle est désactivée à l'impression,
> où un masque qui ne se rasterise pas effacerait le titre. Voir
> [src/styles/print.css](src/styles/print.css).

## Savoir où l'on est : l'identité de rubrique

Le lecteur doit reconnaître sa rubrique sans lire un mot. Une page ne déclare
qu'une chose — `<article class="page" data-rub="astres">` — et trois signaux en
découlent, tous branchés sur la même variable `--sec` :

1. **La couleur** repeint lettrines, filets, étiquettes, emplacements photo.
2. **Le bandeau** (`.flag`) : un aplat, une gravure, et une trame propre à la
   rubrique — étoiles pour les astres, similigravure pour les archives, zellige
   pour la Tunisie, houle pour le grand large, rayures de promo pour la
   boutique, damier pour les jeux.
3. **L'onglet** (`.thumb`) : une languette en bord de page, calée à une hauteur
   différente selon la rubrique. Journal fermé, les onglets dessinent un
   escalier — on ouvre à la bonne rubrique du pouce, comme dans un dictionnaire.

| `data-rub` | Rubriques | Couleur |
| --- | --- | --- |
| `une` | couverture, sommaire, dernière | orange |
| `astres` | horoscope de naissance | bleu nuit |
| `archives` | photo de classe | encre |
| `terroir` | Tunisie, enquête chantilly | orange brûlé |
| `large` | Monique, tour du monde, Antartica, portrait | bleu |
| `boutique` | vente flash | orange vif |
| `jeux` | mots croisés | bleu profond |
| `famille` | courrier des petits-enfants, la lettre de Juliette | orange |
| `musique` | le tube de l'été | bleu |

Deux pages sortent du cadre et deviennent des affiches : `.page--night`
(l'horoscope, papier et encre inversés) et `.page--field` (la quatrième de
couverture, en aplat de rubrique). Voir
[src/styles/sections.css](src/styles/sections.css).

## Les images

Le journal n'a que trois encres : une photo en couleurs y ferait tache. Toute
image posée dans `.photo__frame` est **désaturée puis ré-encrée** en bleu (les
ombres) et en papier ou orange (les lumières, `--warm`) — n'importe quelle
photo de famille entre dans la palette sans retouche.

Un **document** est traité autrement : un cahier, une aquarelle, une carte
postale gardent leurs couleurs. `.photo__frame--doc` se contente de les poser
sur leur papier, à peine calmés — et ne les étire jamais, pour ne pas laisser
de bandes de papier autour.

Tant qu'une photo n'est pas déposée, l'emplacement n'est pas un trou gris :
c'est un aplat de la rubrique, tramé, avec une gravure en filigrane et des
repères de coupe. Les gravures sont dans le sprite SVG en tête de
[index.html](index.html) (`#vg-navire`, `#vg-appareil`, `#vg-palmier`…).

Trois utilitaires de composition, parce qu'une image sage au milieu du texte
fait catalogue :

- `.photo--bleed` : l'image file jusqu'aux deux coupes ;
- `.photo--grow` : elle absorbe la hauteur qui reste, la page est donc toujours
  pleine (à combiner avec `.fill` sur une grille) ;
- `.hero` : le titre s'assoit **sur** l'image — c'est la mise en page de la une.

## Démarrer

```bash
npm install
```

```bash
npm run dev
```

Puis `npm run build` (typecheck + bundle dans `dist/`) et `npm run preview`.

## Naviguer dans le journal

- Sur **téléphone**, les boutons, les pastilles et la barre de progression
  disparaissent : on tourne au doigt et la page prend toute la hauteur.
- **Clic sur une image** : elle s'ouvre en grand, avec sa légende. Les pages du
  carnet de Tunisie sont écrites à la main — à la taille d'une colonne on voit
  que c'est joli, on ne le lit pas. `Échap` referme. Voir
  [src/lightbox.ts](src/lightbox.ts).
- `←` / `→` ou `Page préc.` / `Page suiv.` : tourner une page
- `Début` / `Fin` : couverture / dernière page
- Balayage horizontal au doigt sur mobile
- Pastilles rondes : accès direct à un feuillet

Au-dessus de 900 px, le journal s'affiche en **double page** avec rotation 3D
autour de la reliure. En dessous, il bascule automatiquement en **page unique**
avec transition latérale.


## La règle des pages : rien ne défile

Une page de journal a une hauteur fixe. Ce qui ne rentre pas doit être **coupé,
raccourci ou déplacé sur une autre page** — jamais mis derrière une barre de
défilement. Les pages sont donc en `overflow: hidden`.

Pour ne pas juger ça à l’œil, `npm run dev` active un détecteur : toute page
trop pleine est cerclée de rouge et affiche son dépassement en pixels, et la
console résume l’état des 22 pages. Voir [src/fit.ts](src/fit.ts).

## Une page est le même objet partout

Le contenu d'une page doit apparaître **à l'identique** sur un téléphone, une
tablette et un écran large — seul le décor change (fond, boutons, une page ou
deux). La page garde le même rapport 0,74 et tout ce qu'elle contient se mesure
à elle : `cqw` pour les tailles, `%` pour les marges. Aucune taille de contenu
n'est en `rem`, en `px` ou en `vw`.

> **Le piège à ne pas retomber dedans.** Un élément n'est *jamais son propre
> conteneur*. Dans une règle qui vise `.page`, un `cqw` se résout contre la
> **scène**, pas contre la page — c'est ainsi que la marge a longtemps valu 8 %
> de la page en double page et 3 % sur téléphone. La marge de `.page` est donc
> en pourcentage, et le corps de base est posé sur `.page > *`, où le `cqw` a
> enfin le bon sens. Voir [src/styles/book.css](src/styles/book.css).

Deux corollaires : une page ne se **recompose** jamais (pas de `@container` qui
replie une grille en une colonne — le contenu doublerait de hauteur et
déborderait), et une mise en page qui tient à une taille tient à toutes.

Pour le vérifier, comparez le rapport taille/largeur-de-page d'un élément à
deux tailles d'écran : il ne doit pas bouger.

## Version imprimée

`Ctrl` + `P` : le livre se déplie, une page du journal par feuille, dans
l’ordre. La feuille d'impression ne touche à **aucune** taille de contenu :
elle ne fait que déplier le livre, donc le PDF est le même objet que l'écran. Pas de 3D, pas de commandes, pas de grain, et les aplats de couleur
sortent bien à l’impression. Voir [src/styles/print.css](src/styles/print.css).

## Mettre en ligne

Le journal est un **site statique** : `npm run build` produit un dossier
`dist/` qu'il suffit de recopier tel quel sur l'hébergement.

`vite.config.ts` fixe `base: './'` : tous les chemins sont relatifs. Le
journal marche donc à la racine d'un domaine comme au fond d'un sous-dossier,
et **renommer le dossier ne demande pas de reconstruire**. Ne passez pas
`base` en absolu sans savoir pourquoi.

### Chez OVH

`skymme.com` tourne sur l'**hébergement gratuit 100 Mo** d'OVH
(`skymmem.cluster121.hosting.ovh.net`, datacentre `eu-west-gra`). On dépose
`dist/` dans un sous-dossier de `www/` — `www/le-mamichat/` donnera
`https://skymme.com/le-mamichat/`.

**À la main**, une fois : avec FileZilla ou l'explorateur de fichiers de
l'espace client OVH, glissez le *contenu* de `dist/` (pas le dossier) dans
`www/le-mamichat/`.

**Ensuite**, pour les mises à jour :

```bash
npm run build && npm run deploy
```

Le script lit les identifiants dans `.env.deploy`, à créer à la racine — il est
ignoré par git, les mots de passe ne partent jamais dans le dépôt :

```
FTP_HOST=ftp.cluster121.hosting.ovh.net
FTP_USER=votre-login-ftp
FTP_PASS=votre-mot-de-passe
FTP_DIR=www/le-mamichat
```

Le login se lit dans l'espace client OVH, onglet **FTP - SSH** de l'hébergement.
`npm run deploy -- --dry-run` liste ce qui partirait sans rien envoyer.

### Le poids des photos

Les exports d'images arrivent souvent bien plus grands que l'usage qu'on en
fait : les huit objets de la vente flash sortaient a 1900 px de large pour une
vignette de 200 px, soit 17 Mo a eux seuls.

```bash
npm run images
```

ramene les PNG d'un dossier a 900 px de large au plus — assez pour la loupe et
pour l'impression (~270 dpi sur une carte de 85 mm). Le dossier se passe en
argument, **a dessein** : le carnet de Tunisie et la carte doivent garder leur
definition, on les ouvre a la loupe pour lire l'ecriture.

```bash
node scripts/images.mjs public/images/famille
```

### Le cache

L'hébergement ne posait **aucun en-tête de cache sur `index.html`**. Un lecteur
pouvait donc garder un HTML périmé réclamant une feuille de style publiée
depuis : 404 sur le CSS, page sans style, fond beige nu. Un
[public/.htaccess](public/.htaccess) règle ça — le HTML est revalidé à chaque
visite, les fichiers empreintes (`css`, `js`) sont gardés un an, les images une
journée. Il part avec `dist/` et n'a rien à faire à la main.

### Le poids, et la vidéo

L'hébergement fait **100 Mo**. Le journal en occupe **11**. La vidéo
d'Antarctique, elle, en pèse **170** : elle ne rentre pas.

Le script s'en charge tout seul : il met de côté tout fichier de plus de 40 Mo
(`FTP_MAX_FILE_MB`) et refuse de partir si le total dépasse le quota
(`FTP_QUOTA_MB`). Il l'annonce à chaque envoi.

**Le film est donc servi ailleurs** — il est hébergé en dehors du journal et le
`<video>` pointe dessus. À l'impression, un lecteur vidéo ne veut rien dire :
la page bascule sur l'affiche du film et un **QR code** vers la vidéo
(`.reel`, voir [src/styles/print.css](src/styles/print.css)).

Le QR est une image fixe, gravée une fois pour toutes :

```bash
npm run qr
```

À relancer seulement si l'adresse de la vidéo change, dans
[scripts/qr.mjs](scripts/qr.mjs). Le générer dans le navigateur obligerait à
embarquer une bibliothèque de 25 ko dans le journal — qui n'a par ailleurs
aucune dépendance d'exécution — et ne marcherait que pour ceux passant par le
bouton, pas par `Ctrl` + `P`.

Côté journal, un `<video>` dont la source manque n'affiche pas un lecteur
cassé : [src/film.ts](src/film.ts) le remplace par un emplacement dessiné. Il
n'y a donc rien à changer dans les pages selon que le film est en ligne ou non.

Les vidéos sont hébergées hors du dépôt. Pour en changer une, mettez à jour son
URL de lecture, son affiche et son QR code dans les fichiers du journal ; aucun
MP4 ne doit être déposé dans `public/`.

## Photos

Tout se dépose dans [public/images/](public/images/LISEZMOI.md), un sous-dossier
par thème. Les vidéos restent sur leur hébergement externe.

## Structure

```
index.html              tout le contenu éditorial (une page = une .face)
src/main.ts             câblage de l'interface (boutons, pastilles, compteur)
src/flipbook.ts         moteur de tourne-page, sans dépendance
src/styles/tokens.css   couleurs, typo, espacements, textures
src/styles/base.css     reset et fondations
src/styles/book.css     mise en scène du livre + commandes
src/lightbox.ts         la loupe : une image s'ouvre en grand au clic
src/film.ts             le film absent : un emplacement plutôt qu'un lecteur cassé
scripts/deploy.mjs      envoi de dist/ sur l'hébergement, en FTPS
src/styles/newspaper.css composants éditoriaux (titres, colonnes, encarts)
src/styles/sections.css identité de rubrique (bandeau, onglet, pages en aplat)
src/styles/astres.css   la double page de l'horoscope (carte du ciel, symboles)
public/images/          les photos et documents, un sous-dossier par thème
src/styles/rubriques.css publicités, bons, recette, météo, agenda, photos
```

## Ajouter une page

Les pages vont **par deux** : une feuille (`.sheet`) porte un recto
(`.face--front`) et un verso (`.face--back`). Pour allonger le journal, ajoutez
une `.sheet` complète dans `.book` — le compteur, les pastilles et la barre de
progression s'adaptent tout seuls.

```html
<div class="sheet">
  <div class="face face--front"><article class="page">…</article></div>
  <div class="face face--back"><article class="page">…</article></div>
</div>
```

## Boîte à outils éditoriale

Classes disponibles dans `newspaper.css`, `sections.css` et `rubriques.css` :

- Rubrique : `.flag` (+ `--cont` pour une suite), `.thumb`, `.opener`,
  `.page--night`, `.page--field`
- Titres : `.kicker` (+ `--ghost`, `--orange`, `--blue`), `.headline`
  (+ `--xl`, `--md`, `--sm`, `--sec`, `--shout`, `--clean`), `.deck`,
  `.byline`, `.subhead`
- Texte : `.columns` (+ `--1`, `--3`), `.dropcap`, `.pullquote`
- Chiffres : `.readout` (relevé de bord), `.tally` (grands nombres),
  `.credits` (générique)
- Encadrés : `.box` (+ `--accent`, `--blue`), `.stamp` (+ `--blue`), `.toc`
- Images : `.photo` (+ `--bleed`, `--out`, `--grow`), `.photo__frame` (duotone),
  `.hero`
- Chanson : `.song`, `.spell`, `.lyrics` (+ `__part`, `__chorus`), `.signoff`
- Archives : `.carnet` (planche), `.carnet__quote` (extrait cité)
- Filets : `.rule` (+ `--thick`, `--double`, `--orange`, `--sec`). Le trait qui
  entoure un bloc est `--rule-box` (1 px) : à 2 px, vingt encadrés sur une
  double page font une grille de barreaux.
- Mise en page : `.grid` (+ `--2`, `--sidebar`, `--asym`), `.fill`

Chaque page est un *container* CSS : les tailles sont exprimées en `cqw`, donc
la maquette reste identique quelle que soit la taille de l'écran.

## Notes techniques

- Aucune dépendance d'exécution : le tourne-page est écrit à la main en
  TypeScript.
- `prefers-reduced-motion` est respecté (rotation désactivée).
- Les pages non visibles sont `inert` + `aria-hidden`.
