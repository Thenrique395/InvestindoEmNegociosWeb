# SALES_FUNNEL — Investindo em Negócios

Documento mestre da experiência comercial do produto.

Este arquivo define a estratégia, a arquitetura de informação, a narrativa, os requisitos de UX e os critérios de qualidade para o fluxo composto por:

- Landing page
- Página de planos
- Checkout
- Estados de pagamento
- Ativação inicial do usuário

O objetivo é garantir que essas páginas funcionem como um único funil, e não como telas isoladas.

---

## 1. Objetivo do funil

O funil comercial deve transformar um visitante que ainda não conhece o produto em um usuário que:

1. entende o problema que o sistema resolve;
2. reconhece valor no produto;
3. identifica o plano adequado ao seu momento;
4. conclui cadastro e pagamento com segurança;
5. chega ao Dashboard entendendo o próximo passo.

A experiência comercial deve reduzir quatro barreiras principais:

- falta de clareza sobre o produto;
- dificuldade para escolher um plano;
- medo de cobrança ou compromisso;
- insegurança sobre dados financeiros.

---

## 2. Princípios do produto

O produto não deve ser apresentado apenas como um conjunto de módulos.

O Investindo em Negócios deve comunicar principalmente:

- clareza financeira;
- organização;
- previsibilidade;
- redução de surpresas;
- acompanhamento de metas;
- visão patrimonial;
- confiança para tomar decisões com base nos próprios dados.

### 2.1 Transformação principal

Antes:

- planilhas dispersas;
- contas e cartões separados;
- vencimentos esquecidos;
- dificuldade para saber quanto realmente sobrou;
- metas sem acompanhamento;
- patrimônio sem visão consolidada.

Depois:

- informações centralizadas;
- resumo claro do mês;
- vencimentos visíveis;
- acompanhamento de contas, cartões e metas;
- visão da evolução financeira;
- dados organizados em um único lugar.

### 2.2 Limites de comunicação

O sistema pode:

- organizar dados financeiros;
- consolidar informações;
- apresentar comparativos;
- destacar padrões;
- simular cenários;
- analisar comportamento financeiro;
- acompanhar patrimônio e investimentos cadastrados.

O sistema não deve:

- recomendar compra ou venda de ativos;
- indicar produtos financeiros específicos;
- prometer rentabilidade;
- garantir resultados;
- apresentar opinião financeira como certeza.

---

## 3. Posicionamento

### 3.1 Proposta principal

> Tudo o que acontece com seu dinheiro em um único lugar.

### 3.2 Alternativa de posicionamento

> O sistema operacional da sua vida financeira.

A primeira frase é mais direta e acessível.
A segunda tem posicionamento mais premium e pode ser utilizada em campanhas ou seções institucionais.

### 3.3 Promessa principal

> Organize contas, cartões, despesas, metas e investimentos e saiba quanto realmente sobra todos os meses.

### 3.4 Diferenciais que devem aparecer na comunicação

- visão integrada do mês;
- acompanhamento de contas e cartões;
- calendário financeiro;
- metas acompanhadas por dados reais;
- separação entre controle mensal e visão patrimonial;
- possibilidade de começar gratuitamente;
- não exige senha bancária para começar;
- exportação dos dados;
- evolução por planos conforme a necessidade.

---

## 4. Público e situações de uso

### 4.1 Pessoa que quer sair das planilhas

Dor:

- planilha desatualizada;
- informação espalhada;
- dificuldade de confiar nos números.

Mensagem:

> Centralize sua rotina financeira e acompanhe os valores sem depender de uma planilha manual.

Módulos mais relevantes:

- Dashboard;
- Receitas;
- Despesas;
- Contas;
- Metas.

### 4.2 Pessoa que usa muitos cartões

Dor:

- fatura inesperada;
- parcelas esquecidas;
- dificuldade de entender fechamento e vencimento.

Mensagem:

> Veja compras, parcelas, fechamento e vencimento antes da fatura virar uma surpresa.

Módulos mais relevantes:

- Cartões;
- Faturas;
- Calendário;
- Importação de PDF;
- Contas.

### 4.3 Autônomo ou freelancer

Dor:

- renda variável;
- valores previstos ainda não recebidos;
- dificuldade de separar o que entrou do que ainda vai entrar.

Mensagem:

> Acompanhe o que já recebeu, o que ainda falta receber e quanto pode comprometer no mês.

Módulos mais relevantes:

- Receitas;
- Despesas;
- Calendário;
- Metas de receita;
- Relatórios.

### 4.4 Pessoa com foco patrimonial

Dor:

- patrimônio fragmentado;
- investimentos separados da rotina financeira;
- ausência de visão histórica.

Mensagem:

> Conecte o controle do mês à evolução do seu patrimônio.

Módulos mais relevantes:

- Investimentos;
- Patrimônio;
- Metas;
- Relatórios;
- Projeções.

---

## 5. Jornada comercial

Fluxo principal:

```text
Visitante
  ↓
Landing page
  ↓
Entendimento do produto
  ↓
Demonstração e confiança
  ↓
Página de planos
  ↓
Seleção do plano
  ↓
Cadastro ou login
  ↓
Checkout
  ↓
Pagamento
  ↓
Sucesso, pendência ou falha
  ↓
Onboarding
  ↓
Dashboard
```

### 5.1 Fluxo gratuito

```text
Landing
  ↓
Começar gratuitamente
  ↓
Cadastro
  ↓
Onboarding
  ↓
Dashboard
```

O plano gratuito não deve obrigar o usuário a passar por um checkout pago.

### 5.2 Fluxo de plano pago

```text
Landing ou Planos
  ↓
Selecionar plano pago
  ↓
Cadastro ou login
  ↓
Checkout com plano preservado
  ↓
Pagamento
  ↓
Ativação
  ↓
Onboarding ou Dashboard
```

O plano e o ciclo de cobrança selecionados devem ser preservados durante login, cadastro e retorno ao checkout.

---

## 6. Arquitetura atual identificada

Rotas comerciais existentes:

- `/` — Landing / apresentação do produto;
- `/planos` — Página de planos;
- `/checkout` — Checkout;
- `/checkout/sucesso` — Pagamento aprovado;
- `/checkout/pendente` — Pagamento pendente;
- `/checkout/falha` — Pagamento recusado ou não concluído;
- `/register` — Cadastro;
- `/login` — Login;
- `/onboarding` — Ativação inicial;
- `/assinatura` — Gestão da assinatura para usuário autenticado.

Componentes principais:

- `ProductShowcaseComponent`;
- `PricingComponent`;
- `CheckoutComponent`;
- componentes de status do checkout;
- `SubscriptionsComponent`.

Fonte comercial dos planos:

- `MARKETING_PLANS`.

Essa fonte deve continuar sendo reutilizada pelas páginas comerciais para reduzir divergências de preço, nome, benefícios e posicionamento.

---

## 7. Landing page

### 7.1 Objetivo

A Landing deve fazer o visitante compreender, em poucos segundos:

- o que é o produto;
- qual problema ele resolve;
- para quem ele serve;
- por que é confiável;
- como começar.

### 7.2 Estrutura recomendada

#### Seção 1 — Header

Itens:

- logotipo;
- recursos ou como funciona;
- planos;
- segurança;
- entrar;
- CTA principal.

CTA principal:

> Começar gratuitamente

O menu deve permanecer simples e não competir com a ação principal.

#### Seção 2 — Hero

Título recomendado:

> Controle sua vida financeira sem depender de planilhas.

Subtítulo recomendado:

> Organize contas, cartões, despesas, metas e investimentos em um único lugar e saiba quanto realmente sobra todos os meses.

Ações:

- `Começar gratuitamente`;
- `Ver como funciona`.

Reforços próximos ao CTA:

- plano gratuito;
- sem cartão para começar;
- configuração guiada;
- dados sob controle do usuário.

Visual:

- imagem real ou representação fiel do Dashboard;
- números coerentes;
- interface compatível com o produto real;
- evitar mockup impossível de ser entregue pela aplicação.

#### Seção 3 — Problemas reconhecíveis

Apresentar dores concretas:

- não saber quanto sobrou;
- esquecer vencimentos;
- receber uma fatura maior que o esperado;
- abandonar metas;
- perder confiança na planilha.

Cada dor deve ser conectada a uma solução do produto.

Formato recomendado:

```text
Problema
  ↓
Como o sistema resolve
  ↓
Resultado para o usuário
```

#### Seção 4 — Demonstração do produto

Apresentar blocos para:

- visão geral do mês;
- contas e cartões;
- calendário financeiro;
- metas;
- investimentos e patrimônio.

Cada bloco deve responder:

1. O que o usuário vê?
2. Qual problema isso resolve?
3. Qual benefício ele recebe?

Não descrever somente a funcionalidade.

Exemplo ruim:

> Gráfico de despesas por categoria.

Exemplo recomendado:

> Descubra rapidamente quais categorias estão consumindo mais do seu orçamento.

#### Seção 5 — Benefícios por perfil

Perfis sugeridos:

- quero organizar meu mês;
- uso muito cartão;
- trabalho como autônomo;
- quero acompanhar meu patrimônio.

A seleção de perfil pode destacar:

- módulos relevantes;
- ganho principal;
- plano mais compatível.

Essa associação deve ser apresentada como orientação de uso, não como recomendação financeira.

#### Seção 6 — Antes e depois

Antes:

- planilha manual;
- informações espalhadas;
- vencimentos esquecidos;
- surpresas na fatura;
- decisões baseadas em memória.

Depois:

- dados centralizados;
- visão do saldo real;
- calendário financeiro;
- acompanhamento de metas;
- histórico organizado.

#### Seção 7 — Segurança e confiança

Pontos que podem ser comunicados quando comprovados pelo produto:

- autenticação própria;
- acesso protegido;
- não exige senha bancária para começar;
- ocultação de valores;
- exportação dos dados;
- transparência sobre armazenamento e uso dos dados;
- links para termos e política de privacidade.

Evitar alegações não comprovadas como:

- segurança absoluta;
- inviolável;
- criptografia completa sem validação técnica;
- conformidade legal total sem revisão.

#### Seção 8 — Planos resumidos

A Landing deve apresentar uma visão curta dos planos:

- nome;
- público;
- transformação principal;
- principais recursos;
- preço;
- CTA.

A comparação completa deve permanecer em `/planos`.

#### Seção 9 — FAQ

Perguntas mínimas:

- Posso começar gratuitamente?
- Preciso cadastrar cartão para usar o plano gratuito?
- Preciso conectar minha conta bancária?
- Posso cancelar quando quiser?
- Posso trocar de plano depois?
- Qual a diferença entre os planos?
- Meus dados podem ser exportados?
- O sistema recomenda investimentos?

#### Seção 10 — CTA final

Título recomendado:

> Comece gratuitamente e descubra para onde seu dinheiro está indo.

Ações:

- `Criar conta gratuita`;
- `Comparar planos`.

---

## 8. Página de planos

### 8.1 Objetivo

A página de planos deve reduzir indecisão.

Ela não deve apenas exibir preços. Deve ajudar o usuário a entender:

- qual plano atende sua rotina atual;
- o que muda entre os planos;
- quanto será cobrado;
- quando será cobrado;
- se pode trocar ou cancelar.

### 8.2 Planos atuais

#### Essencial

Posicionamento:

> Para quem quer sair do improviso.

Preço atual:

- mensal: R$ 0,00;
- anual: R$ 0,00.

Função:

- entrada no produto;
- organização da rotina básica;
- geração de confiança antes do upgrade.

CTA:

> Começar gratuitamente

#### Controle

Posicionamento:

> Para quem usa cartão e quer previsibilidade.

Preço atual:

- mensal: R$ 29,90;
- anual: R$ 299,00.

Função:

- centralizar contas, cartões, faturas e transferências;
- reduzir surpresas no mês.

Badge:

> Mais escolhido

CTA:

> Assinar Controle

#### Patrimônio

Posicionamento:

> Para quem quer conectar o mês à visão patrimonial.

Preço atual:

- mensal: R$ 59,90;
- anual: R$ 599,00.

Função:

- consolidar rotina financeira, investimentos e patrimônio.

CTA:

> Assinar Patrimônio

### 8.3 Alternância mensal e anual

O seletor deve mostrar:

- preço do ciclo escolhido;
- valor equivalente mensal no anual;
- economia anual em reais;
- economia em percentual;
- valor total cobrado no ciclo.

A interface não deve esconder o valor total anual.

Exemplo para o plano Controle:

- mensal: R$ 29,90;
- anual: R$ 299,00;
- equivalente mensal aproximado: R$ 24,92;
- economia anual: R$ 59,80.

### 8.4 Cards

Cada card deve conter:

- nome;
- público ideal;
- proposta de valor;
- preço;
- ciclo;
- principais recursos;
- limitações relevantes;
- CTA;
- badge, quando aplicável.

Evitar:

- textos genéricos;
- lista excessiva;
- recursos que não estão liberados tecnicamente;
- limitação escrita de forma punitiva;
- preço sem explicar o ciclo.

### 8.5 Tabela comparativa

Dividir por categorias:

- Dashboard;
- Receitas e despesas;
- Categorias;
- Calendário;
- Metas;
- Contas;
- Transferências;
- Cartões e faturas;
- Importação;
- Investimentos;
- Patrimônio;
- Relatórios;
- Simulações;
- Assistente e insights;
- suporte.

A tabela comercial deve ser compatível com as permissões reais do produto.

Não vender uma funcionalidade que o backend ou o guard do plano ainda não libera.

### 8.6 FAQ específico de planos

- O plano gratuito é permanente?
- Existe período de teste nos planos pagos?
- Posso trocar de plano?
- O que acontece no downgrade?
- Posso cancelar a qualquer momento?
- O que acontece com os dados depois do cancelamento?
- O valor anual é cobrado de uma vez?
- Quais formas de pagamento são aceitas?

---

## 9. Checkout

### 9.1 Objetivo

Concluir a assinatura com o menor atrito possível.

O checkout deve eliminar dúvidas sobre:

- plano selecionado;
- ciclo;
- valor;
- próxima cobrança;
- método de pagamento;
- cancelamento;
- segurança.

### 9.2 Estrutura recomendada

#### Coluna principal

- identificação;
- CPF, quando necessário;
- e-mail;
- telefone, quando necessário;
- método de pagamento;
- dados de cobrança;
- endereço, apenas quando necessário;
- aceite de termos.

Não solicitar novamente dados já disponíveis para usuário autenticado.

#### Resumo lateral

- plano;
- ciclo;
- benefícios principais;
- subtotal;
- desconto;
- total;
- próxima cobrança;
- informação de cancelamento;
- link para alterar o plano.

O resumo deve permanecer visível em desktop e aparecer antes da confirmação em telas menores.

### 9.3 Header do checkout

Manter somente:

- logotipo;
- indicação de ambiente seguro, quando tecnicamente justificável;
- link para voltar aos planos.

Não exibir navegação comercial completa.

### 9.4 Botão de confirmação

O texto deve informar a consequência da ação.

Exemplos:

- `Confirmar assinatura por R$ 29,90/mês`;
- `Confirmar assinatura anual por R$ 299,00`.

Evitar:

- `Continuar`;
- `Próximo`;
- `Finalizar` sem valor ou contexto.

### 9.5 Estados do formulário

Obrigatórios:

- inicial;
- preenchimento;
- validação;
- processando;
- pagamento recusado;
- erro de comunicação;
- tentativa duplicada;
- sessão expirada;
- plano indisponível;
- preço alterado;
- sucesso;
- pendência.

Durante o processamento:

- impedir múltiplos envios;
- mostrar feedback claro;
- preservar os dados;
- não simular sucesso antes da confirmação real.

### 9.6 Regras de integridade

- preço deve vir de fonte confiável;
- o frontend não deve ser autoridade final do valor;
- plano e ciclo devem ser validados no backend;
- evitar dupla cobrança;
- utilizar chave de idempotência quando suportado;
- não armazenar dados sensíveis de cartão indevidamente;
- registrar correlação do checkout sem expor dados sensíveis;
- tratar retorno assíncrono do provedor.

---

## 10. Estados do pagamento

### 10.1 Sucesso

Exibir:

- confirmação do plano;
- data da ativação;
- próxima cobrança;
- ciclo;
- valor;
- recibo ou referência, quando disponível;
- CTA para Dashboard;
- CTA secundário para assinatura.

Mensagem sugerida:

> Sua assinatura foi ativada com sucesso.

### 10.2 Pendente

Exibir:

- status atual;
- motivo possível, quando seguro;
- prazo esperado;
- orientação para não realizar nova cobrança sem necessidade;
- como acompanhar;
- CTA para assinatura ou Dashboard.

Mensagem sugerida:

> Seu pagamento está sendo confirmado.

### 10.3 Falha

Exibir:

- mensagem compreensível;
- possibilidade de tentar novamente;
- possibilidade de alterar método;
- retorno para planos;
- preservação da seleção e dos dados não sensíveis.

Mensagem sugerida:

> Não foi possível concluir o pagamento.

Não culpar o usuário e não apresentar somente códigos técnicos.

---

## 11. Ativação depois da conversão

A conversão não termina no pagamento.

O usuário precisa chegar ao primeiro valor do produto rapidamente.

### 11.1 Plano gratuito

Primeiro resultado esperado:

- cadastrar uma conta;
- adicionar uma receita ou despesa;
- visualizar o resumo do mês.

### 11.2 Plano Controle

Primeiro resultado esperado:

- cadastrar contas e cartões;
- registrar ou importar uma fatura;
- visualizar próximos vencimentos.

### 11.3 Plano Patrimônio

Primeiro resultado esperado:

- concluir a base financeira;
- cadastrar uma posição ou carteira;
- visualizar patrimônio consolidado.

### 11.4 Continuidade da narrativa

A promessa apresentada na Landing deve aparecer novamente no onboarding e no Dashboard.

Exemplo:

Landing:

> Saiba quanto realmente sobra.

Onboarding:

> Vamos configurar as informações necessárias para calcular quanto realmente sobra no seu mês.

Dashboard:

> Saldo previsto após os compromissos do período.

---

## 12. Copywriting

### 12.1 Tom de voz

O produto deve ser:

- direto;
- claro;
- acolhedor;
- confiável;
- responsável;
- sem tom professoral;
- sem promessas exageradas.

### 12.2 Linguagem

Preferir:

- “quanto sobrou”;
- “próximos vencimentos”;
- “o que já entrou”;
- “o que ainda falta receber”;
- “acompanhar sua meta”;
- “organizar sua rotina”.

Evitar:

- jargão técnico;
- “otimize seu portfólio” sem contexto;
- “liberdade financeira garantida”;
- “multiplique seu dinheiro”;
- “fique rico”;
- “melhor investimento”.

### 12.3 CTAs

Principais:

- Começar gratuitamente;
- Criar conta gratuita;
- Comparar planos;
- Assinar Controle;
- Assinar Patrimônio;
- Confirmar assinatura;
- Acessar Dashboard.

Secundários:

- Ver como funciona;
- Conhecer recursos;
- Voltar aos planos;
- Gerenciar assinatura.

### 12.4 Mensagens de erro

Devem responder:

- o que aconteceu;
- se algo foi cobrado;
- o que o usuário pode fazer agora;
- se os dados foram preservados.

---

## 13. Design e consistência visual

As páginas comerciais devem utilizar os mesmos fundamentos do produto:

- tipografia Inter;
- tokens do design system;
- cores semânticas;
- botões padronizados;
- cards consistentes;
- foco visível;
- contraste adequado;
- responsividade;
- densidade visual controlada.

### 13.1 Direção visual

A experiência deve parecer:

- moderna;
- premium;
- confiável;
- financeira sem ser fria;
- simples sem parecer limitada.

### 13.2 Imagens do produto

Priorizar:

- screenshots reais;
- mockups fiéis ao código;
- componentes que existam no produto;
- valores coerentes;
- contexto financeiro brasileiro.

Evitar:

- telas bonitas que não correspondem ao sistema;
- dados inconsistentes;
- excesso de gráficos decorativos;
- mockups impossíveis de reproduzir.

### 13.3 Mobile

No mobile:

- CTA principal deve ficar acessível;
- cards de planos devem ser fáceis de comparar;
- resumo do checkout deve aparecer antes da confirmação;
- tabela de planos deve possuir alternativa adaptada;
- não depender de hover;
- campos devem utilizar teclado apropriado;
- toque mínimo deve respeitar acessibilidade.

---

## 14. Acessibilidade

Requisitos mínimos:

- navegação por teclado;
- foco visível;
- headings em ordem lógica;
- labels explícitos;
- mensagens de erro associadas aos campos;
- contraste adequado;
- CTA compreensível fora de contexto;
- estados não comunicados somente por cor;
- alternância mensal/anual acessível;
- accordion de FAQ acessível;
- anúncios de carregamento e resultado para leitores de tela;
- suporte a redução de movimento.

Carrosséis automáticos devem:

- permitir pausa;
- respeitar `prefers-reduced-motion`;
- não trocar conteúdo durante interação;
- possuir controles acessíveis.

---

## 15. SEO e compartilhamento

A Landing e a página de planos devem possuir:

- título único;
- meta description;
- canonical;
- Open Graph;
- Twitter Card;
- dados estruturados quando aplicável;
- headings semânticos;
- conteúdo indexável;
- sitemap;
- robots configurado;
- URLs estáveis.

Páginas de checkout e status não devem ser tratadas como páginas públicas de aquisição.

Avaliar `noindex` para:

- checkout;
- sucesso;
- pendência;
- falha;
- páginas privadas.

---

## 16. Analytics e métricas

O funil deve ser medido sem capturar dados financeiros sensíveis.

### 16.1 Eventos sugeridos

Landing:

- `marketing_page_viewed`;
- `hero_primary_cta_clicked`;
- `hero_secondary_cta_clicked`;
- `product_preview_selected`;
- `persona_selected`;
- `pricing_section_viewed`;
- `faq_opened`.

Planos:

- `pricing_page_viewed`;
- `billing_cycle_changed`;
- `plan_selected`;
- `plan_comparison_viewed`.

Checkout:

- `checkout_started`;
- `checkout_validation_failed`;
- `checkout_payment_submitted`;
- `checkout_succeeded`;
- `checkout_pending`;
- `checkout_failed`;
- `checkout_abandoned`.

Ativação:

- `signup_completed`;
- `onboarding_started`;
- `onboarding_completed`;
- `first_account_created`;
- `first_transaction_created`;
- `first_dashboard_value_viewed`.

### 16.2 Proibições

Não enviar para analytics:

- CPF completo;
- número de cartão;
- saldo;
- valor de transação;
- senha;
- token;
- descrição sensível;
- dados bancários;
- conteúdo financeiro individual identificável.

### 16.3 Indicadores principais

- visita → clique no CTA;
- CTA → cadastro iniciado;
- cadastro iniciado → cadastro concluído;
- planos → checkout;
- checkout iniciado → pagamento concluído;
- pagamento → onboarding concluído;
- onboarding → primeiro valor percebido;
- plano gratuito → upgrade;
- abandono por etapa.

---

## 17. Regras de planos e contrato comercial

A comunicação comercial deve ser consistente com:

- feature keys;
- guards do frontend;
- autorização do backend;
- limites reais;
- status da assinatura;
- regras de upgrade e downgrade.

Princípios:

1. não esconder apenas visualmente uma restrição que o backend não valida;
2. não vender funcionalidade desativada;
3. não manter preço duplicado em várias fontes independentes;
4. não depender do frontend para validar valor final;
5. mostrar claramente o ciclo da cobrança;
6. preservar o histórico do usuário durante downgrade, conforme regra definida;
7. explicar o que será bloqueado antes de confirmar downgrade.

---

## 18. Requisitos técnicos do fluxo

### 18.1 Estado da seleção

Preservar:

- código do plano;
- ciclo;
- origem da campanha, quando aplicável;
- cupom, quando aplicável;
- retorno após autenticação.

### 18.2 SSR

Como a aplicação possui SSR, as páginas públicas devem:

- renderizar sem dependência exclusiva de `window`;
- evitar layout shift;
- carregar conteúdo principal no servidor;
- inicializar interações apenas no navegador;
- manter metadata por rota.

### 18.3 Performance

Metas:

- carregar primeiro conteúdo rapidamente;
- evitar imagens excessivas;
- lazy-load de seções não críticas;
- imagens responsivas;
- reduzir JavaScript da Landing;
- não carregar módulos privados no funil público;
- evitar carrossel pesado;
- monitorar Core Web Vitals.

### 18.4 Observabilidade

Registrar erros de:

- navegação;
- carregamento de planos;
- início de checkout;
- retorno do provedor;
- ativação da assinatura;
- redirecionamentos quebrados.

Não registrar dados financeiros sensíveis.

---

## 19. Testes necessários

### 19.1 Unitários

- seleção de preview;
- pausa do carrossel;
- cálculo de economia anual;
- seleção do plano;
- persistência do ciclo;
- montagem do resumo do checkout;
- tratamento dos estados de pagamento;
- fallback de plano inválido.

### 19.2 Integração

- plano exibido corresponde ao contrato;
- preço do checkout corresponde ao backend;
- usuário autenticado mantém plano selecionado;
- usuário não autenticado retorna ao checkout após login/cadastro;
- assinatura ativada libera as funcionalidades corretas;
- falha não ativa plano;
- pendência não simula aprovação.

### 19.3 E2E

Fluxos mínimos:

1. Landing → cadastro gratuito → onboarding → Dashboard;
2. Landing → planos → Controle mensal → checkout → sucesso;
3. Planos → Patrimônio anual → cadastro → checkout → sucesso;
4. Checkout → falha → tentar novamente;
5. Checkout → pendência → acompanhamento;
6. plano inválido → retorno seguro para planos;
7. refresh no checkout sem perder seleção;
8. navegação por teclado;
9. versão mobile;
10. redução de movimento.

---

## 20. Critérios de aceite por página

### 20.1 Landing

- proposta entendida rapidamente;
- CTA principal visível;
- produto demonstrado com fidelidade;
- dores conectadas a benefícios;
- planos resumidos;
- segurança explicada sem exageros;
- FAQ presente;
- responsiva;
- acessível;
- eventos medidos.

### 20.2 Planos

- diferenças claras;
- ciclo mensal/anual transparente;
- economia calculada corretamente;
- valor total anual visível;
- funcionalidades compatíveis com permissões reais;
- plano gratuito claramente explicado;
- CTA específico por plano;
- tabela comparativa acessível;
- FAQ de cobrança e cancelamento.

### 20.3 Checkout

- plano e preço visíveis;
- mínimo de distração;
- dados pré-preenchidos quando possível;
- validação clara;
- prevenção de duplo envio;
- resumo antes da confirmação;
- estados de erro, pendência e sucesso;
- preço validado no backend;
- não exposição de dados sensíveis.

---

## 21. Roadmap recomendado

### Fase 1 — Auditoria e contrato

- revisar HTML, SCSS e TypeScript das páginas;
- mapear integrações;
- validar preços e permissões;
- localizar mocks e campos incompletos;
- registrar divergências;
- definir baseline de métricas.

### Fase 2 — Landing

- melhorar hero;
- reorganizar narrativa;
- reforçar demonstração real;
- estruturar dores e soluções;
- revisar segurança;
- adicionar FAQ;
- melhorar CTA final;
- revisar SEO e performance.

### Fase 3 — Planos

- melhorar posicionamento dos cards;
- implementar alternância mensal/anual transparente;
- exibir economia;
- criar comparação detalhada;
- alinhar recursos às permissões;
- revisar FAQ;
- preservar seleção no fluxo.

### Fase 4 — Checkout

- reduzir distração;
- melhorar resumo;
- revisar validações;
- tratar idempotência;
- aprimorar estados;
- preservar dados;
- integrar eventos de funil.

### Fase 5 — Ativação e otimização

- alinhar onboarding à promessa comercial;
- medir primeiro valor percebido;
- acompanhar abandono;
- executar testes de copy e layout;
- melhorar upgrade dentro do produto;
- criar prova social quando existirem dados reais.

---

## 22. Backlog inicial

### P0 — Integridade e confiança

- validar preço e plano no backend;
- impedir dupla cobrança;
- garantir que falha ou pendência não ativem assinatura;
- alinhar permissões comerciais com frontend e backend;
- revisar exposição de dados sensíveis;
- revisar retorno após autenticação.

### P1 — Conversão

- revisar hero;
- melhorar demonstração real do produto;
- aprimorar cards de planos;
- mostrar economia anual;
- melhorar resumo do checkout;
- adicionar FAQ;
- revisar status de pagamento;
- preservar plano e ciclo durante todo o fluxo.

### P2 — Qualidade

- SEO por rota;
- acessibilidade;
- responsividade;
- redução de movimento;
- performance;
- testes E2E;
- métricas de funil;
- observabilidade.

### P3 — Evolução

- demonstração interativa;
- tour do produto;
- calculadora de valor percebido;
- casos de uso por perfil;
- histórias reais de clientes;
- programa de indicação;
- cupons e campanhas;
- páginas específicas para Família e CNPJ;
- testes A/B com governança.

---

## 23. Decisões pendentes

Antes da implementação definitiva, definir:

- o plano Essencial será gratuito permanentemente?
- haverá período de teste nos planos pagos?
- quais formas de pagamento serão suportadas?
- o anual será cobrado integralmente?
- haverá cupom?
- haverá reembolso?
- como funcionará cancelamento?
- como funcionará upgrade proporcional?
- como funcionará downgrade?
- o que acontece com dados de módulos bloqueados?
- quais recursos estão realmente disponíveis em cada plano?
- quais claims de segurança podem ser comprovadas?
- quais métricas podem ser coletadas dentro da política de privacidade?

---

## 24. Regra de manutenção deste documento

Sempre atualizar este documento quando houver alteração relevante em:

- posicionamento;
- nomes dos planos;
- preços;
- ciclo de cobrança;
- recursos por plano;
- checkout;
- provedor de pagamento;
- onboarding;
- regras de upgrade ou downgrade;
- política de cancelamento;
- comunicação de segurança;
- métricas do funil.

Alterações comerciais não devem ser implementadas somente no HTML.

Devem ser revisadas em conjunto com:

- contrato de planos;
- permissões;
- backend;
- banco;
- analytics;
- testes;
- documentação.

---

## 25. Próximo passo

Executar uma auditoria detalhada dos arquivos atuais de:

- `product-showcase`;
- `pricing`;
- `checkout`;
- `checkout-status`;
- `marketing-plans`;
- autenticação e retorno;
- assinatura.

A auditoria deve produzir:

- inventário do que já existe;
- pontos fortes;
- inconsistências;
- funcionalidades incompletas;
- riscos técnicos;
- melhorias de UX;
- backlog priorizado;
- critérios de aceite para implementação.

Nenhuma refatoração visual deve começar antes dessa leitura completa do fluxo atual.
