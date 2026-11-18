---
title: "Fórmulas de porcentaje: calificaciones, descuentos y cambios"
h1: "Fórmulas de porcentaje explicadas: calificaciones, descuentos y aumento o disminución con ejemplos"
shortTitle: "Fórmulas de porcentaje"
description: "Fórmulas de porcentaje para calificaciones, descuentos y subidas o bajadas de precio, resueltas paso a paso, y los errores que dan resultados erróneos."
date: 2026-11-18
updated: 2026-11-18
author: "Abu Umair"
category: "Guía de matemáticas"
tool: "percentage-calculator"
relatedTools:
  - percentage-calculator
  - percentage-change-calculator
  - marks-percentage-calculator
  - discount-calculator
ogType: article
ogImage: "https://toolsbuilt.com/assets/blog/percentage-formulas-explained/es/og.png"
ogImageAlt: "Tarjeta de la guía de ToolsBuilt: fórmulas de porcentaje para calificaciones, descuentos y variaciones, con ejemplos resueltos"
faqs:
  - question: "¿Cómo calculo el porcentaje de mis calificaciones?"
    answer: "Divide las calificaciones que obtuviste entre el total y multiplica por 100. Para 912 de 1100, eso es 912 ÷ 1100 × 100 = 82.91%. Usa el total que aparece en tu propio boletín de resultados, porque los totales cambian según el board y el grupo."
  - question: "¿Cómo calculo un porcentaje de descuento?"
    answer: "Resta el precio de oferta al precio original, divide entre el precio original y multiplica por 100. Una etiqueta que baja de Rs 3,200 a Rs 2,720 tiene un descuento de (3,200 − 2,720) ÷ 3,200 × 100 = 15%."
  - question: "¿Cómo calculo un aumento o una disminución porcentual?"
    answer: "Resta el valor anterior al nuevo, divide entre el valor anterior y multiplica por 100. Un alquiler que pasa de Rs 40,000 a Rs 46,000 es un aumento del 15%. Un resultado positivo es un aumento y uno negativo, una disminución."
  - question: "¿Un 20% de descuento y luego otro 10% es lo mismo que un 30%?"
    answer: "No. El segundo descuento se aplica sobre el precio ya rebajado. Sobre Rs 5,000, un 20% de descuento deja Rs 4,000, y un 10% sobre eso deja Rs 3,600. El ahorro total es de Rs 1,400, que es un 28%, no un 30%."
  - question: "¿Qué diferencia hay entre por ciento y puntos porcentuales?"
    answer: "Los puntos porcentuales son la diferencia simple entre dos porcentajes, mientras que la variación porcentual compara esa diferencia con el valor de partida. Si una tasa de aprobados sube del 40% al 50%, sube 10 puntos porcentuales, lo que supone un aumento del 25%."
---

Un porcentaje es una parte dividida entre el total, multiplicada por 100. Para las calificaciones de un examen es **obtenidas ÷ total × 100**; con un descuento, el precio de oferta es **precio × (1 − descuento ÷ 100)**; y para una subida o una bajada es **(nuevo − anterior) ÷ anterior × 100**. Todos los errores de esta guía se reducen a dividir entre el número equivocado, así que vuelve una y otra vez a la misma pregunta: ¿de qué valor partiste?

<div class="key-takeaways">
<p class="key-takeaways-title">Puntos clave</p>
<ul>
<li>Porcentaje = parte ÷ total × 100. El "total" es siempre el valor de partida o el máximo posible.</li>
<li>Para deshacer un descuento, divide entre (1 − descuento). Volver a sumar el mismo porcentaje da un precio equivocado.</li>
<li>Dos descuentos seguidos no se suman: 20% y luego 10% es 28%, no 30%.</li>
<li>Una subida del 15% se compensa con una bajada del 13.04%, no del 15%.</li>
<li>Nunca promedies porcentajes con totales distintos. Suma primero los puntos.</li>
</ul>
</div>

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/es/percentage-formulas-cheat-sheet.webp" width="1600" height="900" alt="Chuleta con cuatro fórmulas de porcentaje: calificaciones 912 ÷ 1100 × 100 = 82.91%, descuento 2,400 × (1 − 0.15) = Rs 2,040, variación (46,000 − 40,000) ÷ 40,000 = 15% y descuento inverso 2,040 ÷ 0.85 = Rs 2,400">
<figcaption>Las cuatro fórmulas que desarrolla esta guía, cada una con el ejemplo que se usa más abajo.</figcaption>
</figure>

## ¿Cuál es la fórmula básica del porcentaje?

Porcentaje = (parte ÷ total) × 100. Para hallar el porcentaje de un número, se hace al revés: (porcentaje ÷ 100) × número. Así, 18 aprobados de 24 alumnos son 18 ÷ 24 × 100 = 75%, y el 15% de Rs 2,400 es 0.15 × 2,400 = Rs 360.

Esas dos direcciones resuelven la mayoría de las preguntas cotidianas:

- **"¿Qué porcentaje es esto?"** Divide y luego multiplica por 100. 18 ÷ 24 = 0.75, y 0.75 × 100 = 75%.
- **"¿Cuánto es el X% de esto?"** Convierte el porcentaje en decimal y multiplica. 15% pasa a ser 0.15, y 0.15 × 2,400 = 360.

Una tercera pregunta, "¿de qué número es esto el X%?", hace el camino inverso: número ÷ (porcentaje ÷ 100). Si Rs 360 son el 15% de algo, ese algo es 360 ÷ 0.15 = Rs 2,400. Nuestra [calculadora de porcentaje](/tools/percentage-calculator/) tiene un modo para cada uno de estos casos y muestra el desarrollo.

<div class="table-wrapper" role="region" aria-label="Qué fórmula de porcentaje usar" tabindex="0">
<table class="table">
<thead><tr><th>Quieres saber</th><th>Fórmula</th><th>Ejemplo</th></tr></thead>
<tbody>
<tr><td>Tus calificaciones en porcentaje</td><td>obtenidas ÷ total × 100</td><td>912 ÷ 1100 × 100 = 82.91%</td></tr>
<tr><td>El X% de un número</td><td>X ÷ 100 × número</td><td>15% de 2,400 = 360</td></tr>
<tr><td>Precio tras un descuento</td><td>precio × (1 − X ÷ 100)</td><td>2,400 × 0.85 = 2,040</td></tr>
<tr><td>Porcentaje de descuento a partir de dos precios</td><td>(original − oferta) ÷ original × 100</td><td>(3,200 − 2,720) ÷ 3,200 = 15%</td></tr>
<tr><td>Precio antes de un descuento</td><td>oferta ÷ (1 − X ÷ 100)</td><td>2,040 ÷ 0.85 = 2,400</td></tr>
<tr><td>Aumento o disminución</td><td>(nuevo − anterior) ÷ anterior × 100</td><td>(46,000 − 40,000) ÷ 40,000 = 15%</td></tr>
</tbody>
</table>
</div>

## ¿Cómo calculo el porcentaje de mis calificaciones?

Divide las calificaciones que obtuviste entre el total y multiplica por 100. Si sacaste 912 de 1100 en matric, eso es 912 ÷ 1100 = 0.82909, y × 100 = 82.91%. Usa el total que aparece en tu propio boletín de resultados, porque los totales varían según el board, el grupo y el año.

Paso a paso:

1. Obtenidas ÷ total: 912 ÷ 1100 = 0.829091.
2. × 100 = 82.9091%.
3. Redondea a dos decimales: **82.91%**.

Para los resultados de FSc o ICS, que vienen en dos partes, suma las partes antes de dividir. Supón que en la parte 1 sacaste 465 de 550 y en la parte 2, 478 de 550. En conjunto son 943 de 1100, y 943 ÷ 1100 × 100 = **85.73%**. Por separado, las partes dan 84.55% y 86.91%. Aquí, promediar esos dos porcentajes da casualmente el mismo 85.73%, pero solo porque las dos partes valen los mismos 550 puntos. La sección de errores muestra qué falla cuando no es así.

La misma fórmula sirve para una sola materia. 68 de 75 en matemáticas es 68 ÷ 75 × 100 = 90.67%.

Si prefieres que la cuenta se haga sola, con una calificación típica al estilo de los BISE junto al resultado, introduce tus datos en la [calculadora de porcentaje de calificaciones](/tools/marks-percentage-calculator/?mode=total&obtained=912&total=1100#tool). Para los agregados de admisión universitaria, que ponderan de forma distinta matric, inter y la prueba de ingreso, usa la [calculadora de mérito](/tools/merit-calculator/), porque las ponderaciones salen de la fórmula de cada universidad.

## ¿Cómo calculo un descuento y el precio de oferta?

Multiplica el precio por (1 − descuento ÷ 100). Un comerciante que hace un 15% de descuento en un traje de Rs 2,400 cobra 2,400 × 0.85 = Rs 2,040, es decir, Rs 360 menos. Para hallar el porcentaje de descuento a partir de dos precios, divide lo ahorrado entre el precio original: (3,200 − 2,720) ÷ 3,200 × 100 = 15%.

En la tienda se dan las dos situaciones.

**Calcular el precio de oferta.** El 15% de 2,400 es 360. Réstalo: 2,400 − 360 = Rs 2,040. O en un solo paso: 2,400 × 0.85 = 2,040. La versión en un paso es práctica con la calculadora del teléfono, porque 0.85 es simplemente "lo que queda tras un 15% de descuento".

**Calcular cuánto descuento hay de verdad.** Una etiqueta dice Rs 3,200, tachado, y ahora Rs 2,720. El ahorro es de Rs 480. Divide entre el precio original, no entre el de oferta: 480 ÷ 3,200 = 0.15, así que es un 15% de descuento. Dividir entre 2,720 daría 17.65%, lo que hace parecer mejor la oferta.

**Dos descuentos seguidos.** A los carteles de rebajas les encanta el "10% extra sobre precios rebajados". En un artículo de Rs 5,000 con un 20% de descuento y luego otro 10%:

1. El 20% de 5,000 = 1,000, así que el precio pasa a Rs 4,000.
2. El 10% de 4,000 (no de 5,000) = 400, así que el precio pasa a Rs 3,600.
3. Ahorro total: 1,400 ÷ 5,000 × 100 = **28%**.

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/es/stacked-discount-20-then-10-percent.webp" width="1600" height="900" loading="lazy" alt="Gráfico de barras de un artículo de Rs 5,000: tras un 20% de descuento cuesta Rs 4,000 y tras otro 10% cuesta Rs 3,600, un ahorro total del 28%, frente a Rs 3,500 si el descuento fuera realmente del 30%">
<figcaption>El segundo descuento se calcula sobre el precio ya rebajado, así que los dos porcentajes nunca se suman sin más.</figcaption>
</figure>

Pagas Rs 100 más de lo que costaría con un 30% directo. No es un escándalo, pero conviene saberlo cuando compiten dos ofertas. La [calculadora de descuentos](/tools/discount-calculator/?price=5000&off=20&off2=10&cur=PKR#tool) resuelve descuentos encadenados y, si quieres, el impuesto sobre las ventas, en un solo paso.

## ¿Cómo calculo un aumento o una disminución porcentual?

Resta el valor anterior al nuevo, divide entre el valor anterior y multiplica por 100: (nuevo − anterior) ÷ anterior × 100. Si el alquiler pasa de Rs 40,000 a Rs 46,000, la variación es 6,000 ÷ 40,000 × 100 = 15%. Un resultado positivo es un aumento y uno negativo, una disminución.

La base es el valor del que partiste, y por eso un aumento y la disminución equivalente no son iguales. Si ese alquiler vuelve a bajar de Rs 46,000 a Rs 40,000, la variación es −6,000 ÷ 46,000 × 100 = **−13.04%**. Son las mismas Rs 6,000, pero medidas frente a un número de partida mayor.

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/es/percentage-increase-decrease-not-symmetric.webp" width="1600" height="900" loading="lazy" alt="Gráfico de barras de un alquiler que sube de Rs 40,000 a Rs 46,000, un aumento del 15%, y vuelve a bajar a Rs 40,000, una disminución del 13.04%, porque el segundo cambio se divide entre 46,000">
<figcaption>Las mismas Rs 6,000 son el 15% del alquiler más bajo, pero solo el 13.04% del más alto.</figcaption>
</figure>

También funciona al revés. Si subes un precio un 25% y luego lo bajas un 25%, no vuelves al punto de partida. Rs 1,000 pasan a Rs 1,250, y un 25% de descuento sobre Rs 1,250 deja Rs 937.50. Por eso, si "los precios subieron un 25% y luego bajaron un 25%", quedan más bajos que antes.

La [calculadora de variación porcentual](/tools/percentage-change-calculator/) calcula aumentos, disminuciones y diferencias porcentuales, y te dice qué base ha usado.

## ¿Qué diferencia hay entre por ciento y puntos porcentuales?

Los puntos porcentuales son la diferencia simple entre dos porcentajes. La variación porcentual mide esa diferencia respecto al porcentaje de partida. Si la tasa de aprobados de un colegio pasa del 40% al 50%, sube 10 puntos porcentuales, pero un 25% en términos relativos, porque 10 ÷ 40 × 100 = 25%.

Las dos afirmaciones son ciertas. Responden a preguntas distintas, y confundirlas es lo que hace que un cambio modesto se presente como uno espectacular, o al revés. Cuando leas "sube un 10%", es razonable preguntarse: ¿10 puntos o un 10 por ciento de la cifra anterior? Math is Fun tiene una página breve y clara sobre los [puntos porcentuales](https://www.mathsisfun.com/percentage-points.html) si quieres más ejemplos.

La misma distinción aparece con las tasas de interés. Si la tasa de un préstamo pasa del 16% al 18%, sube 2 puntos porcentuales, lo que supone un aumento del 12.5% en la propia tasa. Nuestra guía sobre [cómo calcular la cuota EMI de un préstamo en Pakistán](/blog/how-to-calculate-loan-emi-in-pakistan/) muestra qué hacen esos 2 puntos en un préstamo hipotecario a 15 años.

## ¿Qué errores dan resultados de porcentaje equivocados?

Los cuatro siguientes vienen de dividir entre el número equivocado: promediar porcentajes con totales distintos, sumar descuentos encadenados, deshacer un descuento volviendo a sumar el porcentaje y confundir el beneficio sobre el costo con el beneficio sobre el precio. Cada uno lleva el cálculo erróneo junto al correcto, para que puedas detectarlo en tus propias cuentas.

### Promediar porcentajes con totales distintos

Un estudiante saca 18 de 20 en una prueba de clase (90%) y 60 de 100 en el examen (60%).

- **Mal:** (90% + 60%) ÷ 2 = **75%**.
- **Bien:** suma primero los puntos. (18 + 60) ÷ (20 + 100) = 78 ÷ 120 × 100 = **65%**.

<figure class="post-figure">
<img src="/assets/blog/percentage-formulas-explained/es/averaging-percentages-mistake.webp" width="1600" height="900" loading="lazy" alt="Tarjeta comparativa: promediar 90% y 60% da un 75% incorrecto, mientras que sumar primero los puntos, 78 de 120, da el 65% correcto">
<figcaption>La prueba de 20 puntos es una sexta parte de los puntos posibles, así que no puede pesar tanto como el examen.</figcaption>
</figure>

### Deshacer un descuento volviendo a sumar el porcentaje

Pagaste Rs 2,040 tras un 15% de descuento y quieres saber el precio original.

- **Mal:** 2,040 + 15% de 2,040 = 2,040 × 1.15 = **Rs 2,346**.
- **Bien:** 2,040 ÷ 0.85 = **Rs 2,400**. El 15% se restó del precio original, así que divides entre lo que quedó, el 85%.

La misma trampa atrapa a quien quiere quitar el impuesto sobre las ventas de un recibo. Para descomponer un precio con impuestos incluidos, divide; no restes la tasa del impuesto al total.

### Confundir margen de ganancia y markup

Un comerciante compra mercancía por Rs 1,600 y la vende por Rs 2,400. La ganancia es de Rs 800.

- Como porcentaje del costo (markup): 800 ÷ 1,600 × 100 = **50%**.
- Como porcentaje del precio de venta (margen): 800 ÷ 2,400 × 100 = **33.33%**.

Ninguno es incorrecto, pero son números distintos. Si un proveedor te dice "mantén un margen del 50%" y tú aplicas un markup del 50%, tu margen es un tercio, no la mitad. La [calculadora de margen de ganancia](/tools/profit-margin-calculator/) muestra los dos a la vez.

### Sumar descuentos encadenados

Ya lo vimos arriba: 20% y luego 10% de descuento es 28%, no 30%. Multiplica en cambio los factores de "lo que queda": 0.80 × 0.90 = 0.72, así que pagas el 72% y ahorras el 28%.

## ¿Qué calculadora debo usar?

Usa la que corresponda a tu pregunta: la calculadora de porcentaje para "el X% de Y" y "qué porcentaje es X de Y", la de calificaciones para los resultados, la de descuentos para precios y ofertas, y la de variación porcentual cuando algo subió o bajó. Todas muestran la fórmula y el desarrollo, para que puedas compararlo con tus propias cuentas.

- [Calculadora de porcentaje](/tools/percentage-calculator/): el X% de un número, qué porcentaje es un número de otro y porcentajes inversos.
- [Calculadora de porcentaje de calificaciones](/tools/marks-percentage-calculator/): calificaciones obtenidas y totales, materia por materia si quieres.
- [Calculadora de descuentos](/tools/discount-calculator/): precio de oferta, dinero ahorrado y descuentos encadenados.
- [Calculadora de variación porcentual](/tools/percentage-change-calculator/): aumento, disminución y diferencia porcentual.

La página de Math is Fun sobre la [variación porcentual](https://www.mathsisfun.com/numbers/percentage-change.html) explica la misma fórmula con más ejercicios de estilo escolar. Cuando el dinero crece o disminuye cada mes, los porcentajes se acumulan, y la [guía de la cuota EMI](/blog/how-to-calculate-loan-emi-in-pakistan/) continúa desde ahí.
