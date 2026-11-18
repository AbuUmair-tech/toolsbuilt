---
title: "Formules de pourcentage : notes, remises et variations"
h1: "Les formules de pourcentage expliquées : notes, remises, hausses et baisses, avec exemples"
shortTitle: "Formules de pourcentage"
description: "Les formules de pourcentage pour les notes d'examen, les remises et les hausses ou baisses de prix, chacune détaillée pas à pas, et les erreurs à éviter."
date: 2026-11-18
updated: 2026-11-18
author: "Abu Umair"
category: "Guide de maths"
tool: "percentage-calculator"
relatedTools:
  - percentage-calculator
  - percentage-change-calculator
  - marks-percentage-calculator
  - discount-calculator
ogType: article
ogImage: "https://toolsbuilt.com/assets/blog/percentage-formulas-explained/fr/og.png"
ogImageAlt: "Carte de guide ToolsBuilt : formules de pourcentage pour les notes, les remises et les variations, avec des exemples détaillés"
faqs:
  - question: "Comment calculer le pourcentage de mes notes ?"
    answer: "Divisez les points obtenus par le total des points et multipliez par 100. Pour 912 sur 1100, cela donne 912 ÷ 1100 × 100 = 82.91%. Utilisez le total indiqué sur votre propre relevé de notes, car les totaux varient selon les boards et les filières."
  - question: "Comment calculer un pourcentage de remise ?"
    answer: "Soustrayez le prix soldé du prix d'origine, divisez par le prix d'origine et multipliez par 100. Une étiquette qui passe de Rs 3,200 à Rs 2,720 correspond à (3,200 − 2,720) ÷ 3,200 × 100 = 15% de remise."
  - question: "Comment calculer une hausse ou une baisse en pourcentage ?"
    answer: "Soustrayez l'ancienne valeur de la nouvelle, divisez par l'ancienne valeur et multipliez par 100. Un loyer qui passe de Rs 40,000 à Rs 46,000 augmente de 15%. Un résultat positif indique une hausse, un résultat négatif une baisse."
  - question: "20% de remise puis 10% de remise, est-ce la même chose que 30% de remise ?"
    answer: "Non. La deuxième remise s'applique au prix déjà réduit. Sur Rs 5,000, 20% de remise donnent Rs 4,000, et 10% de remise sur ce prix donnent Rs 3,600. L'économie totale est de Rs 1,400, soit 28%, et non 30%."
  - question: "Quelle est la différence entre pour cent et points de pourcentage ?"
    answer: "Les points de pourcentage sont la simple différence entre deux pourcentages, tandis que la variation en pourcentage compare cette différence à la valeur de départ. Un taux de réussite qui passe de 40% à 50% gagne 10 points de pourcentage, ce qui représente une hausse de 25%."
---

Un pourcentage, c'est une partie divisée par le tout, multipliée par 100. Pour des notes d'examen, cela donne **points obtenus ÷ total × 100** ; pour une remise, le prix soldé vaut **prix × (1 − remise ÷ 100)** ; et pour une hausse ou une baisse, c'est **(nouveau − ancien) ÷ ancien × 100**. Les erreurs décrites dans ce guide viennent toutes d'une division par le mauvais nombre, c'est pourquoi il revient sans cesse à la même question : de quelle valeur êtes-vous parti ?

<div class="key-takeaways">
<p class="key-takeaways-title">À retenir</p>
<ul>
<li>Pourcentage = partie ÷ tout × 100. Le « tout » est toujours la valeur de départ ou le total possible.</li>
<li>Pour annuler une remise, divisez par (1 − remise). Rajouter le même pourcentage donne un prix faux.</li>
<li>Deux remises successives ne s'additionnent pas : 20% puis 10% font 28%, pas 30%.</li>
<li>Une hausse de 15% est annulée par une baisse de 13.04%, pas de 15%.</li>
<li>Ne faites jamais la moyenne de pourcentages calculés sur des totaux différents. Additionnez d'abord les points.</li>
</ul>
</div>

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/fr/percentage-formulas-cheat-sheet.webp" width="1600" height="900" alt="Aide-mémoire de quatre formules de pourcentage : notes 912 ÷ 1100 × 100 = 82.91%, remise 2,400 × (1 − 0.15) = Rs 2,040, variation (46,000 − 40,000) ÷ 40,000 = 15%, et remise inversée 2,040 ÷ 0.85 = Rs 2,400">
<figcaption>Les quatre formules détaillées dans ce guide, chacune avec l'exemple utilisé plus bas.</figcaption>
</figure>

## Quelle est la formule de base du pourcentage ?

Pourcentage = (partie ÷ tout) × 100. Pour trouver un pourcentage d'un nombre, on prend le chemin inverse : (pourcentage ÷ 100) × nombre. Ainsi, 18 élèves reçus sur 24 font 18 ÷ 24 × 100 = 75%, et 15% de Rs 2,400 font 0.15 × 2,400 = Rs 360.

Ces deux sens couvrent la plupart des questions du quotidien :

- **« Ça fait combien pour cent ? »** Divisez, puis multipliez par 100. 18 ÷ 24 = 0.75, et 0.75 × 100 = 75%.
- **« Combien font X% de ce nombre ? »** Transformez le pourcentage en décimal et multipliez. 15% devient 0.15, et 0.15 × 2,400 = 360.

Une troisième question, « c'est X% de combien ? », fait le chemin à rebours : nombre ÷ (pourcentage ÷ 100). Si Rs 360 représentent 15% d'une somme, cette somme vaut 360 ÷ 0.15 = Rs 2,400. Notre [calculateur de pourcentage](/tools/percentage-calculator/) propose un mode pour chacune de ces questions, avec le calcul détaillé.

<div class="table-wrapper" role="region" aria-label="Quelle formule de pourcentage utiliser" tabindex="0">
<table class="table">
<thead><tr><th>Vous voulez connaître</th><th>Formule</th><th>Exemple</th></tr></thead>
<tbody>
<tr><td>Vos notes en pourcentage</td><td>points obtenus ÷ total × 100</td><td>912 ÷ 1100 × 100 = 82.91%</td></tr>
<tr><td>X% d'un nombre</td><td>X ÷ 100 × nombre</td><td>15% de 2,400 = 360</td></tr>
<tr><td>Le prix après une remise</td><td>prix × (1 − X ÷ 100)</td><td>2,400 × 0.85 = 2,040</td></tr>
<tr><td>Le pourcentage de remise à partir de deux prix</td><td>(prix d'origine − prix soldé) ÷ prix d'origine × 100</td><td>(3,200 − 2,720) ÷ 3,200 = 15%</td></tr>
<tr><td>Le prix avant une remise</td><td>prix soldé ÷ (1 − X ÷ 100)</td><td>2,040 ÷ 0.85 = 2,400</td></tr>
<tr><td>Une hausse ou une baisse</td><td>(nouveau − ancien) ÷ ancien × 100</td><td>(46,000 − 40,000) ÷ 40,000 = 15%</td></tr>
</tbody>
</table>
</div>

## Comment calculer le pourcentage de mes notes ?

Divisez vos points obtenus par le total des points et multipliez par 100. Si vous avez eu 912 sur 1100 au matric, cela donne 912 ÷ 1100 = 0.82909, puis × 100 = 82.91%. Utilisez le total indiqué sur votre propre relevé de notes, car les totaux varient selon les boards, les filières et les années.

Le calcul étape par étape :

1. Points obtenus ÷ total : 912 ÷ 1100 = 0.829091.
2. × 100 = 82.9091%.
3. Arrondi à deux décimales : **82.91%**.

Pour les résultats de FSc ou d'ICS en deux parties, additionnez les parties avant de diviser. Disons que la partie 1 donne 465 sur 550 et la partie 2, 478 sur 550. Ensemble, cela fait 943 sur 1100, et 943 ÷ 1100 × 100 = **85.73%**. Prises séparément, les parties valent 84.55% et 86.91%. Ici, la moyenne des deux donne par hasard le même 85.73%, mais seulement parce que les deux parties comptent chacune 550 points. La section sur les erreurs montre ce qui se passe quand ce n'est pas le cas.

La même formule fonctionne pour une seule matière. 68 sur 75 en maths donnent 68 ÷ 75 × 100 = 90.67%.

Si vous voulez que le calcul soit fait pour vous, avec une mention de type BISE affichée à côté du résultat, saisissez vos notes dans le [calculateur de pourcentage des notes](/tools/marks-percentage-calculator/?mode=total&obtained=912&total=1100#tool). Pour les agrégats d'admission à l'université, qui pondèrent différemment les notes du matric, de l'inter et du test d'entrée, utilisez plutôt le [calculateur de mérite](/tools/merit-calculator/), car les coefficients dépendent de la formule de chaque université.

## Comment calculer une remise et le prix soldé ?

Multipliez le prix par (1 − remise ÷ 100). Un commerçant qui fait 15% de remise sur un costume à Rs 2,400 demande 2,400 × 0.85 = Rs 2,040, soit Rs 360 de moins. Pour trouver le pourcentage de remise à partir de deux prix, divisez la somme économisée par le prix d'origine : (3,200 − 2,720) ÷ 3,200 × 100 = 15%.

Les deux calculs se présentent à la caisse.

**Calculer le prix soldé.** 15% de 2,400 font 360. Retirez-les : 2,400 − 360 = Rs 2,040. Ou en une seule étape : 2,400 × 0.85 = 2,040. La version en une étape est pratique sur la calculatrice d'un téléphone, car 0.85 correspond simplement à « ce qui reste après 15% de remise ».

**Mesurer la vraie taille d'une remise.** Une étiquette affiche Rs 3,200, barré, puis Rs 2,720. L'économie est de Rs 480. Divisez par le prix d'origine, pas par le prix soldé : 480 ÷ 3,200 = 0.15, soit 15% de remise. Diviser par 2,720 donnerait 17.65%, ce qui embellit l'affaire.

**Deux remises successives.** Les affiches de soldes adorent les « 10% supplémentaires sur les prix soldés ». Sur un article à Rs 5,000 avec 20% de remise puis 10% :

1. 20% de 5,000 = 1,000, le prix passe donc à Rs 4,000.
2. 10% de 4,000 (et non de 5,000) = 400, le prix passe donc à Rs 3,600.
3. Économie totale : 1,400 ÷ 5,000 × 100 = **28%**.

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/fr/stacked-discount-20-then-10-percent.webp" width="1600" height="900" loading="lazy" alt="Graphique en barres d'un article à Rs 5,000 : après 20% de remise il coûte Rs 4,000, après 10% de remise supplémentaire il coûte Rs 3,600, soit une économie totale de 28%, contre Rs 3,500 si la remise était vraiment de 30%">
<figcaption>La deuxième remise est calculée sur le prix déjà réduit : les deux pourcentages ne s'additionnent donc jamais simplement.</figcaption>
</figure>

Vous payez Rs 100 de plus qu'avec une vraie remise de 30%. Rien de scandaleux, mais bon à savoir quand deux offres sont en concurrence. Le [calculateur de remise](/tools/discount-calculator/?price=5000&off=20&off2=10&cur=PKR#tool) gère les remises cumulées et, si besoin, la taxe de vente en une seule fois.

## Comment calculer une hausse ou une baisse en pourcentage ?

Soustrayez l'ancienne valeur de la nouvelle, divisez par l'ancienne valeur et multipliez par 100 : (nouveau − ancien) ÷ ancien × 100. Si un loyer passe de Rs 40,000 à Rs 46,000, la variation est de 6,000 ÷ 40,000 × 100 = 15%. Un résultat positif indique une hausse, un résultat négatif une baisse.

La base est la valeur de départ, et c'est pourquoi une hausse et la baisse correspondante ne sont pas égales. Si ce loyer redescend ensuite de Rs 46,000 à Rs 40,000, la variation est de −6,000 ÷ 46,000 × 100 = **−13.04%**. Les mêmes Rs 6,000, mais rapportées à un point de départ plus élevé.

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/fr/percentage-increase-decrease-not-symmetric.webp" width="1600" height="900" loading="lazy" alt="Graphique en barres d'un loyer qui passe de Rs 40,000 à Rs 46,000, soit une hausse de 15%, puis revient à Rs 40,000, soit une baisse de 13.04%, car la deuxième variation est divisée par 46,000">
<figcaption>Les mêmes Rs 6,000 représentent 15% du loyer le plus bas, mais seulement 13.04% du plus élevé.</figcaption>
</figure>

Cela marche aussi dans l'autre sens. Augmentez un prix de 25% puis baissez-le de 25%, et vous ne revenez pas au point de départ. Rs 1,000 deviennent Rs 1,250, et 25% de remise sur Rs 1,250 donnent Rs 937.50. Voilà pourquoi des prix « en hausse de 25% puis en baisse de 25% » restent plus bas qu'avant.

Le [calculateur de variation en pourcentage](/tools/percentage-change-calculator/) calcule les hausses, les baisses et l'écart en pourcentage, et indique la base qu'il a utilisée.

## Quelle est la différence entre pour cent et points de pourcentage ?

Les points de pourcentage sont la simple différence entre deux pourcentages. La variation en pourcentage mesure cette différence par rapport au pourcentage de départ. Si le taux de réussite d'une école passe de 40% à 50%, il gagne 10 points de pourcentage, mais augmente de 25% en valeur relative, car 10 ÷ 40 × 100 = 25%.

Les deux affirmations sont vraies. Elles répondent à des questions différentes, et c'est en les confondant qu'un changement modeste est présenté comme spectaculaire, ou l'inverse. Quand vous lisez « en hausse de 10% », la question est légitime : 10 points, ou 10% de l'ancien chiffre ? Le site Math is Fun propose une page courte et claire sur les [points de pourcentage](https://www.mathsisfun.com/percentage-points.html) si vous voulez d'autres exemples.

La même distinction vaut pour les taux d'intérêt. Un taux de prêt qui passe de 16% à 18% augmente de 2 points de pourcentage, soit une hausse de 12.5% du taux lui-même. Notre guide sur [le calcul de l'EMI d'un prêt au Pakistan](/blog/how-to-calculate-loan-emi-in-pakistan/) montre l'effet de ces 2 points sur un prêt immobilier de 15 ans.

## Quelles erreurs faussent un calcul de pourcentage ?

Les quatre erreurs ci-dessous viennent toutes d'une division par le mauvais nombre : faire la moyenne de pourcentages aux totaux différents, additionner des remises successives, inverser une remise en rajoutant le pourcentage, et confondre bénéfice sur le coût et bénéfice sur le prix de vente. Chacune est présentée avec le mauvais calcul à côté du bon, pour que vous puissiez la repérer dans vos propres calculs.

### Faire la moyenne de pourcentages aux totaux différents

Un élève obtient 18 sur 20 à un contrôle (90%) et 60 sur 100 à l'examen (60%).

- **Faux :** (90% + 60%) ÷ 2 = **75%**.
- **Juste :** additionnez d'abord les points. (18 + 60) ÷ (20 + 100) = 78 ÷ 120 × 100 = **65%**.

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/fr/averaging-percentages-mistake.webp" width="1600" height="900" loading="lazy" alt="Carte comparative : la moyenne de 90% et 60% donne un faux 75%, alors qu'additionner d'abord les points, 78 sur 120, donne le bon résultat de 65%">
<figcaption>Le contrôle sur 20 points ne représente qu'un sixième des points en jeu : il ne peut pas compter autant que l'examen.</figcaption>
</figure>

### Inverser une remise en rajoutant le pourcentage

Vous avez payé Rs 2,040 après une remise de 15% et vous voulez retrouver le prix d'origine.

- **Faux :** 2,040 + 15% de 2,040 = 2,040 × 1.15 = **Rs 2,346**.
- **Juste :** 2,040 ÷ 0.85 = **Rs 2,400**. Les 15% ont été retirés du prix d'origine : il faut donc diviser par ce qui restait, 85%.

Le même piège guette ceux qui veulent retirer la taxe de vente d'un ticket de caisse. Pour décomposer un prix taxe comprise, divisez, au lieu de soustraire le taux de taxe du total.

### Confondre marge et majoration

Un commerçant achète un stock Rs 1,600 et le revend Rs 2,400. Le bénéfice est de Rs 800.

- En pourcentage du coût (majoration) : 800 ÷ 1,600 × 100 = **50%**.
- En pourcentage du prix de vente (marge) : 800 ÷ 2,400 × 100 = **33.33%**.

Aucun des deux n'est faux, mais ce sont des chiffres différents. Si un fournisseur vous dit « gardez une marge de 50% » et que vous appliquez une majoration de 50%, votre marge sera d'un tiers, et non de la moitié. Le [calculateur de marge et de majoration](/tools/profit-margin-calculator/) affiche les deux à la fois.

### Additionner des remises successives

Déjà vu plus haut : 20% puis 10% de remise font 28%, pas 30%. Multipliez plutôt les facteurs « ce qui reste » : 0.80 × 0.90 = 0.72, vous payez donc 72% et économisez 28%.

## Quel calculateur de pourcentage utiliser ?

Celui qui correspond à votre question : le calculateur de pourcentage pour « X% de Y » et « X représente quel pourcentage de Y », le calculateur de notes pour les résultats d'examen, le calculateur de remise pour les prix et les promotions, et le calculateur de variation en pourcentage quand une valeur a augmenté ou baissé. Chacun affiche la formule et le calcul, pour que vous puissiez les comparer à vos propres calculs.

- [Calculateur de pourcentage](/tools/percentage-calculator/) : X% d'un nombre, quel pourcentage un nombre représente d'un autre, et pourcentages inversés.
- [Calculateur de pourcentage des notes](/tools/marks-percentage-calculator/) : points obtenus et total des points, matière par matière si vous le souhaitez.
- [Calculateur de remise](/tools/discount-calculator/) : prix soldé, somme économisée et remises cumulées.
- [Calculateur de variation en pourcentage](/tools/percentage-change-calculator/) : hausse, baisse et écart en pourcentage.

La page de Math is Fun sur la [variation en pourcentage](https://www.mathsisfun.com/numbers/percentage-change.html) reprend la même formule avec davantage d'exercices de type scolaire. Quand de l'argent augmente ou diminue chaque mois, les pourcentages se composent, et le [guide sur l'EMI de prêt](/blog/how-to-calculate-loan-emi-in-pakistan/) prend le relais.
