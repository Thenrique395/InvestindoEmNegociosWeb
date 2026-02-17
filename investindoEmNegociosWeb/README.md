# InvestindoEmNegociosWeb

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.19.

## Design system (padrao do projeto)
Para manter consistencia visual, use os padroes descritos em `systemDesigner.md`.

Resumo pratico:
- **Botoes**: `btn-primary`, `btn-danger`, `btn-warning`, `btn-ghost`, `btn-cancel` (com `sm` quando for compacto).
- **Badges/Status**: preferir `border + bg-100 + text-700` (legibilidade alta).
- **Tooltips**: icone circular "i" com borda sutil e tooltip com `border-strong` e `shadow-lg`.
- **Modais**: evitar `window.confirm` e usar modal do sistema.
- **Datas**: usar `DD/MM/AAAA` e parse sem deslocamento de fuso.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Possíveis melhorias
- Sincronização automática dos compromissos.
- Receber lembretes automáticos no WhatsApp.
- Recursos de organização e produtividade no dia a dia (rotinas, prioridades e acompanhamento de tarefas financeiras).
- Lembretes configuráveis por parcela/série (dias antes do vencimento), com job diário na API para disparar notificações (SMTP MailHog/SendGrid ou web-push) e badges/toasts no front.
- Exportar/Importar: exportar despesas do mês em CSV/Excel e importar lista simples (nome, valor, vencimento, categoria) para agilizar migração.
- Ações em lote: botão “Mover vencimento” para reagendar várias despesas de uma vez (apenas status elegíveis), salvando vencimento original e aplicando regras como evitar pagas/canceladas.
- Agenda e lembretes smart: filtro “Atrasadas” com cor/total próprio; tolerância por categoria (ex.: aluguel 0 dias, academia 2 dias) para atraso real; tendência mês a mês (% a mais/menos) e previsão de fechamento.
- Automação leve: regras por categoria (ex.: marcar como pago se valor <= X e status antecipada; reagendar para próximo dia útil se cair em fim de semana/feriado simples).
- UX das listas: filtros salvos por usuário (status/categoria), busca por faixa de valor e vencimento, coluna “dias para vencer/atrasar” com semáforo.
- Histórico e auditoria: timeline por despesa (criação, antecipações, pagamentos, notas) e exportação filtrada (apenas resultados do filtro atual) em CSV/Excel.
- Qualidade de dados: aviso de possíveis duplicados (mesmo nome/valor/vencimento) e sugestão de categoria baseada em histórico.
- Integração leve: importação colando texto “nome;valor;dd/mm/aaaa;categoria” e webhook “after pay/anticipate” para integrações futuras (mesmo que só logue).

## Receitas — possíveis melhorias
- Cards simples: Previstas, Recebidas e Atrasadas no mês.
- Filtros rápidos: status (prevista/recebida/atrasada), categoria e busca por texto.
- Ações básicas: marcar recebida, editar data/valor, excluir, exportar CSV do filtro atual.
- Importação leve: colar linhas “nome;valor;dd/mm/aaaa;categoria” para cadastrar várias receitas.
- Aviso discreto: badge no topo se houver receitas atrasadas (total e quantidade).

## Cartões — possíveis melhorias
- Resumos por cartão: limite, fatura atual/fechamento, próximos vencimentos e parcelas ativas.
- Identificação rápida: badge de bandeira/cor e status ativo/inativo.
- Cadastro/edição: coletar limite e dia de fechamento/vencimento; lembrete opcional se bandeira não carregar.
- Lista de despesas do cartão: filtro “ver só este cartão”, totais parcelados/antecipados, botão para quitar fatura (se fizer sentido no modelo).
- Ações rápidas: editar apelido, alterar vencimento, bloquear/excluir.
- Histórico: timeline simples de alterações (limite, vencimento) e despesas vinculadas.
- Exportação: baixar despesas do cartão em CSV; importação básica de cartões (limite/dados).

## METAS — possíveis melhorias
Se associar a uma conta/receita, permitir “registrar aporte automático” todo mês.
Notificações: aviso quando ficar 2 meses abaixo do esperado ou quando atingir 90%/100%.
