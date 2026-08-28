# Schema do banco de dados — mapa parcial e desatualizado

> ## ⚠️ Leia antes de usar
>
> **Última atualização manual: `2026-02-06`.** Conferido contra o banco em 2026-08-28:
> este documento descreve **20 tabelas das 43 que existem**. Faltam áreas inteiras do
> produto — `accounts`, `account_transactions`, `loan_contracts`, `loan_installments`,
> `loan_amortizations`, `billing_checkouts`, `billing_webhook_events`, `goal_occurrences`,
> `goal_scopes`, `investment_allocation_targets`, entre outras.
>
> **A fonte de verdade do schema é EF Migrations**, em `InvestindoEmNegocio/Migrations/`,
> aplicadas por `Migrate()` no boot. Não existe mais `schema.sql`.
>
> Para ver o schema real:
>
> ```bash
> # lista as tabelas
> docker exec investindoemnegocio-postgres-1 psql -U investindo -d meu_mentor_db -c '\dt'
> # detalha uma tabela
> docker exec investindoemnegocio-postgres-1 psql -U investindo -d meu_mentor_db -c '\d accounts'
> ```
>
> Mantido porque as 20 tabelas descritas continuam corretas e o texto explica
> relacionamentos lógicos que o schema sozinho não mostra. **Não trate como completo.**

Mapa textual parcial do schema persistido pelo `InvestDbContext`. O diagrama visual
correspondente continua em `schema.svg` — e tem a mesma limitação de data.

## Escopo

- descreve as tabelas mais relevantes para o produto **em fevereiro de 2026**
- destaca FKs reais e relacionamentos apenas logicos
- serve como apoio rapido de leitura, nao como fonte unica de migration

## Observacoes

- as entidades `Income` e `Expense` existem no dominio, mas nao sao persistidas diretamente no `DbContext` atual
- alguns relacionamentos sao apenas logicos e estao marcados abaixo
- qualquer mudanca estrutural relevante deve ser refletida aqui junto com as migrations correspondentes

## Entidades principais

### users
Armazena os usuarios do sistema e dados de seguranca.
- Chave primaria: `id`
- Unicidade: `email`
- Campos relevantes: `name`, `email`, `password_hash`, `role`, `is_active`, `last_login_at`, `failed_login_attempts`, `lockout_until`, `trial_used_at`, `is_anonymized`, `deleted_at`, `created_at`, `updated_at`.
- `is_anonymized`/`deleted_at` suportam o fluxo de exclusão LGPD por anonimização (`User.Anonymize`): PII é zerada e o registro é mantido para auditoria, em vez de deletado fisicamente.

### user_profiles
Preferencias e dados pessoais do usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id` (unico por usuario)
- Campos: nome completo, documento, telefone, localizacao, idioma/moeda, preferencias de notificacao.

### user_onboarding
Controle de onboarding do usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id` (unico por usuario)
- Campos: `step`, `completed`, `created_at`, `updated_at`.

### refresh_tokens
Tokens de refresh do usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id`
- Campos: `token_hash`, `expires_at`, `revoked_at`, `replaced_by_token_hash`, `created_at`.

### audit_logs
Historico de auditoria.
- Chave primaria: `id`
- FK: `user_id -> users.id` (nullable, delete set null)
- Campos: `action`, `entity`, `entity_id`, `ip_address`, `user_agent`, `metadata`, `created_at`.

## Catalogos e referencias

### categories
Categorias de receitas/despesas (por usuario ou globais).
- Chave primaria: `id`
- FK: `user_id -> users.id` (opcional)
- Campos: `name`, `applies_to`, `is_active`, `created_at`.

### card_brands
Bandeiras de cartao.
- Chave primaria: `id`
- Campos: `name`, `code` (unico), `is_active`.

### payment_methods
Formas de pagamento.
- Chave primaria: `id`
- Campos: `name`, `is_active`.

### institutions
Instituicoes financeiras.
- Chave primaria: `id`
- Campos: `name`, `type`, `is_active`.

## Cartoes

### cards
Cartoes vinculados ao usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id`
- FK: `brand_id -> card_brands.id`
- Campos: `nickname`, `last4`, `bank`, `credit_limit`, `statement_close_day`, `due_day`, `created_at`, `updated_at`.

## Planejamento financeiro

### money_plans
Planos financeiros (receitas/despesas, avulso/recorrente/parcelado).
- Chave primaria: `id`
- FK: `user_id -> users.id`
- FK: `category_id -> categories.id` (opcional)
- FK: `card_id -> cards.id` (opcional)
- FK **logica**: `default_payment_method_id -> payment_methods.id` (opcional)
- Campos: `type`, `title`, `amount`, `schedule`, `frequency`, `installments_count`, `start_date`, `status`, `created_at`, `updated_at`.

### money_installments
Parcelas geradas a partir de um plano.
- Chave primaria: `id`
- FK: `plan_id -> money_plans.id`
- FK: `user_id -> users.id`
- Campos: `installment_no`, `due_date`, `original_due_date`, `amount`, `status`, `created_at`, `updated_at`.

### money_payments
Pagamentos registrados para parcelas.
- Chave primaria: `id`
- FK: `installment_id -> money_installments.id`
- FK: `user_id -> users.id`
- FK **logica**: `method_id -> payment_methods.id` (opcional)
- Campos: `paid_at`, `paid_amount`, `note`, `created_at`.

## Metas

### goals
Metas financeiras por usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id`
- Campos: `title`, `target_amount`, `current_amount`, `year`, `expected_monthly`, `target_date`, `description`, `status`, `created_at`, `updated_at`.

### goal_contributions
Lancamentos/ aportes em metas.
- Chave primaria: `id`
- FK: `goal_id -> goals.id`
- FK: `user_id -> users.id`
- Campos: `amount`, `date`, `note`, `created_at`.

## Investimentos

### investment_goals
Meta global de investimento do usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id` (unico por usuario)
- Campos: `target_amount`, `created_at`, `updated_at`.

### investment_positions
Posicoes de investimento.
- Chave primaria: `id`
- FK: `user_id -> users.id`
- Campos: `type`, `asset`, `quantity`, `avg_price`, `opened_at`, `account`, `category`, `note`, `created_at`, `updated_at`.

### investment_movements
Movimentos dentro de uma posicao.
- Chave primaria: `id`
- FK: `position_id -> investment_positions.id`
- Campos: `type`, `quantity`, `price`, `date`, `note`, `created_at`.

## Notificacoes

### notification_settings
Configuracoes globais de notificacao.
- Chave primaria: `id`
- Campos: flags e limites (receita/despesa/cartao/mes/metas), `created_at`, `updated_at`.

### user_notifications
Notificacoes enviadas ao usuario.
- Chave primaria: `id`
- FK: `user_id -> users.id`
- FK **logica**: `plan_id -> money_plans.id` (opcional)
- FK **logica**: `installment_id -> money_installments.id` (opcional)
- Campos: `kind`, `money_type`, `reference_key`, `title`, `message`, `due_date`, `created_at`, `read_at`.
