---
title: "Bem-vindo ao ToolsBuilt: ferramentas grátis e privadas"
h1: "Bem-vindo ao ToolsBuilt: calculadoras e ferramentas grátis que rodam no seu navegador"
shortTitle: "Bem-vindo ao ToolsBuilt"
description: "O ToolsBuilt reúne 50 calculadoras e ferramentas web grátis em 9 idiomas. Sem cadastro e sem anúncios, e as contas são feitas no seu próprio navegador."
date: 2026-10-24
updated: 2026-11-18
author: "Abu Umair"
category: "Sobre o ToolsBuilt"
tool: "password-generator"
relatedTools:
  - password-generator
tags:
  - post
  - announcement
ogType: article
ogImage: "https://toolsbuilt.com/assets/blog/welcome-to-toolsbuilt/pt/og.png"
ogImageAlt: "Card do ToolsBuilt: calculadoras e ferramentas web grátis que rodam no seu navegador"
faqs:
  - question: "O ToolsBuilt é mesmo grátis?"
    answer: "Sim. Todas as ferramentas são gratuitas, sem conta, sem limite de uso e sem plano pago. Também não há anúncios no site. Você abre uma página, digita os valores e recebe o resultado na hora."
  - question: "O ToolsBuilt vê os números que eu digito?"
    answer: "Não. O cálculo roda em JavaScript dentro do seu navegador, então os seus dados não são enviados a um servidor do ToolsBuilt. Algumas ferramentas guardam os últimos dados digitados no armazenamento local do navegador, que fica no seu aparelho, e o botão Redefinir apaga essas informações."
  - question: "O ToolsBuilt usa cookies ou ferramentas de análise?"
    answer: "O Google Analytics só é carregado depois que você o aceita no aviso de cookies, e nunca se o seu navegador enviar o sinal Do Not Track. Ele conta as visitas às páginas e quais ferramentas são mais usadas, e não o que você digita numa ferramenta. Se você recusar, todas as ferramentas continuam funcionando."
  - question: "Em quais idiomas o ToolsBuilt está disponível?"
    answer: "Em nove: inglês, alemão, francês, espanhol, português, indonésio, árabe, hindi e urdu. Use o menu de idiomas no topo de qualquer página para trocar. As páginas em árabe e urdu são lidas da direita para a esquerda."
  - question: "Como sugerir uma nova ferramenta ou informar um resultado errado?"
    answer: "Use a página de Contato ou o botão Sugerir uma ferramenta no rodapé de todas as páginas. Se um resultado parecer errado, inclua os números que você digitou, para que o cálculo possa ser conferido e corrigido."
---

O ToolsBuilt é uma coleção gratuita de 50 calculadoras e ferramentas web, de uma [calculadora de EMI de empréstimo](/tools/loan-emi-calculator/) a um [gerador de senhas](/tools/password-generator/). Não há cadastro nem anúncios, e todos os cálculos rodam dentro do seu próprio navegador. Esta página explica o que há no site, como ele trata os seus dados e quem o desenvolve.

<div class="key-takeaways">
<p class="key-takeaways-title">Pontos principais</p>
<ul>
<li>50 ferramentas grátis em 7 categorias, de finanças e notas de provas a texto, datas e código.</li>
<li>Os dados que você digita são calculados no seu navegador e não são enviados a um servidor do ToolsBuilt.</li>
<li>Sem conta, sem conteúdo pago e sem anúncios. As estatísticas de acesso só são carregadas se você aceitar.</li>
<li>Todas as ferramentas estão disponíveis em 9 idiomas, incluindo urdu, árabe e hindi.</li>
<li>O código-fonte do site é público no GitHub, então qualquer pessoa pode conferir como um resultado é calculado.</li>
</ul>
</div>

Quando comecei a construir o ToolsBuilt, eu tinha uma regra: uma ferramenta útil deve ser gratuita, rápida e privada. Muitas calculadoras online escondem a ferramenta no meio de anúncios, pedem uma conta antes de mostrar o resultado ou enviam o que você digita para um servidor sobre o qual você não sabe nada. O ToolsBuilt foi pensado para ser o oposto dessas três coisas.

## O que é o ToolsBuilt?

O ToolsBuilt é um site de ferramentas com uma única função cada: calculadoras, conversores, geradores e formatadores. Cada ferramenta faz uma só tarefa, na sua própria página. Você digita os valores e recebe o resultado na hora. Não há nada para instalar, nenhuma conta para criar e nenhum limite de uso.

Em todas as páginas, a ferramenta vem primeiro. Abaixo dela, as calculadoras explicam como chegam à resposta: a fórmula, exemplos resolvidos com números reais e erros comuns, seguidos de respostas a perguntas frequentes. O objetivo é que você consiga conferir um resultado por conta própria, em vez de confiar num número sem ver o raciocínio por trás dele.

## Quais ferramentas você encontra no ToolsBuilt?

O ToolsBuilt tem 50 ferramentas em 7 categorias. Matemática e finanças é o maior grupo, com 15 ferramentas, como EMI de empréstimo, juros compostos, SIP e imposto sobre salário. Datas e texto têm 8 cada, as ferramentas para estudantes somam 7, segurança 5, formatadores de código 4 e sorteios 3. Cada categoria tem a sua própria página.

| Categoria | Ferramentas | Exemplos |
|---|---|---|
| [Matemática e finanças](/category/math-finance/) | 15 | [EMI de empréstimo](/tools/loan-emi-calculator/), [Porcentagem](/tools/percentage-calculator/), juros compostos, SIP, imposto sobre salário |
| [Data e hora](/category/date-time/) | 8 | [Calculadora de idade](/tools/age-calculator/), diferença entre datas, horas, fusos horários |
| [Texto e escrita](/category/text/) | 8 | [Contador de palavras](/tools/word-counter/), conversor de maiúsculas e minúsculas, comparador de textos |
| [Estudantes e provas](/category/education/) | 7 | [GPA](/tools/gpa-calculator/), porcentagem de notas, CGPA para porcentagem, frequência |
| [Segurança e privacidade](/category/security/) | 5 | [Gerador de senhas](/tools/password-generator/), força da senha, hash, UUID |
| [Formatadores de código](/category/code/) | 4 | Formatadores de JSON, Python, Java e HTML |
| [Sorteio e diversão](/category/fun/) | 3 | Sorteador de nomes, número aleatório, cara ou coroa e dados |

<figure class="post-figure">
<img src="/assets/blog/welcome-to-toolsbuilt/pt/tools-by-category.webp" width="1600" height="900" alt="Gráfico de barras das 50 ferramentas do ToolsBuilt por categoria: Matemática e finanças 15, Data e hora 8, Texto e escrita 8, Estudantes e provas 7, Segurança e privacidade 5, Formatadores de código 4, Sorteio e diversão 3" loading="lazy" decoding="async">
<figcaption>Como as 50 ferramentas se distribuem pelas 7 categorias.</figcaption>
</figure>

Várias ferramentas foram feitas pensando no Paquistão. As calculadoras de empréstimo e de poupança começam em rupias, a menos que o seu navegador indique outro país, a calculadora de imposto sobre salário segue as faixas da FBR e as ferramentas para estudantes cobrem as notas do matric, do FSc e da universidade. Você pode trocar a moeda em qualquer ferramenta que envolva dinheiro.

Você pode ver tudo na [página com todas as ferramentas](/tools/) ou pressionar <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>⌘</kbd> + <kbd>K</kbd> no Mac) em qualquer página para buscar pelo nome.

## Como as ferramentas mantêm os seus dados privados?

Os cálculos rodam em JavaScript dentro do seu navegador. Quando você digita o valor de um empréstimo ou cola um trecho de texto, a ferramenta calcula a resposta no seu próprio aparelho, então os seus dados não são enviados a um servidor do ToolsBuilt. Depois que a página carrega, calcular um resultado não exige nenhuma requisição de rede.

<figure class="post-figure">
<img src="/assets/blog/welcome-to-toolsbuilt/pt/how-a-calculation-stays-in-your-browser.webp" width="1600" height="900" alt="Diagrama: os seus dados entram no código da ferramenta, no seu navegador, e o resultado volta na mesma página. Nada com os seus dados vai para um servidor do ToolsBuilt." loading="lazy" decoding="async">
<figcaption>Os seus valores, a fórmula e o resultado ficam todos no seu aparelho.</figcaption>
</figure>

O [gerador de senhas](/tools/password-generator/) é um bom exemplo. A aleatoriedade vem da função [`crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), que já vem no seu navegador e é uma fonte criptograficamente segura. A senha é criada no seu aparelho e mostrada na página. Ela não é enviada a lugar nenhum e desaparece quando você fecha a aba.

Há três coisas que vale saber para ter o quadro completo:

1. **Algumas ferramentas lembram os últimos dados que você digitou.** Elas os salvam no armazenamento local do navegador para que continuem lá na próxima vez. Esses dados ficam no seu aparelho, e o botão Redefinir da ferramenta apaga tudo.
2. **Os links de resultado colocam os seus dados na barra de endereço.** Depois do cálculo, o endereço da página pode incluir os seus valores (por exemplo `?amount=1500000`) para você compartilhar o resultado ou salvá-lo nos favoritos. Só compartilhe esse link com quem você quer que veja esses números.
3. **As estatísticas só rodam se você disser sim.** O Google Analytics só é carregado depois que você o aceita no aviso de cookies, e nunca se o seu navegador enviar o sinal Do Not Track. Ele conta as visitas às páginas, e não o que você digita numa ferramenta. A [Política de Privacidade](/privacy-policy/) traz os detalhes.

## Em quais idiomas o ToolsBuilt está disponível?

Todas as ferramentas e páginas estão disponíveis em nove idiomas: inglês, alemão, francês, espanhol, português, indonésio, árabe, hindi e urdu. Troque de idioma pelo menu no topo de qualquer página. As páginas traduzidas usam as mesmas fórmulas e os mesmos exemplos, e as páginas em árabe e urdu são lidas da direita para a esquerda.

As calculadoras também seguem o seu idioma ao mostrar números e datas, então uma página em alemão escreve os decimais com vírgula, enquanto uma página em inglês usa ponto. Os valores em si são os mesmos em todos os idiomas.

## As calculadoras são precisas?

Cada calculadora usa uma fórmula padrão e publicada, mostra essa fórmula na página e resolve exemplos reais para você conferir o resultado à mão. O código dos cálculos é coberto por testes automatizados que precisam passar antes de qualquer mudança ir ao ar. Mesmo assim, os resultados são estimativas, e não aconselhamento financeiro ou jurídico.

Esse último ponto pesa mais quando o assunto é dinheiro. Uma calculadora de empréstimo pode dizer quanto custa uma determinada taxa, mas são a taxa real do seu banco, as tarifas e o arredondamento que decidem quanto você vai pagar de verdade. Quando uma ferramenta depende de regras que mudam, como as faixas de imposto, a página cita a fonte e o ano a que ela se aplica. Se encontrar um resultado que pareça errado, por favor, avise e informe os números que você digitou.

## Quem faz o ToolsBuilt?

O ToolsBuilt é criado e mantido por uma única pessoa, [Abu Umair](/about/#author), que desenvolve as ferramentas e cuida dos guias e das explicações de todas as páginas. O site é estático, feito com [Eleventy](https://www.11ty.dev/) e JavaScript puro, sem frameworks pesados, e fica hospedado no GitHub Pages. O código-fonte completo é [público no GitHub](https://github.com/AbuUmair-tech/toolsbuilt).

Manter o código público faz parte da promessa de privacidade. Você não precisa acreditar na minha palavra de que uma ferramenta roda no seu navegador: qualquer pessoa que saiba ler JavaScript pode abrir o código da ferramenta e ver exatamente como ela chega à resposta.

Manter o site leve também é o que faz as páginas carregarem rápido no celular. Não há framework para baixar, e as explicações longas abaixo de cada ferramenta são HTML simples.

## Como sugerir uma ferramenta ou informar um erro?

Mande uma mensagem pela página de [Contato](/contact/) ou use o botão Sugerir uma ferramenta no rodapé de todas as páginas. Ideias de ferramentas, resultados errados, textos confusos e correções de tradução são todos bem-vindos. Se for um problema de cálculo, inclua os valores que você digitou, para que ele possa ser reproduzido e corrigido.

## O que vem por aí?

Novas ferramentas serão adicionadas conforme as pessoas pedirem, e as que já existem vão continuar ganhando explicações mais claras e mais exemplos resolvidos. O blog vai trazer guias como [como calcular a EMI de empréstimo](/blog/how-to-calculate-loan-emi-in-pakistan/) e [fórmulas de porcentagem explicadas](/blog/percentage-formulas-explained/), que mostram a matemática por trás de uma ferramenta com números reais.

Obrigado pela visita. Espero que o ToolsBuilt economize um pouco do seu tempo.

— **Abu Umair**
