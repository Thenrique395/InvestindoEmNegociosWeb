#!/usr/bin/env bash
# Popula a conta de DEV com histórico suficiente para o dashboard mostrar
# gráfico de 12 meses, recorrências, agenda de 7 dias e pendências.
#
# Uso:  API_EMAIL=... API_PASSWORD=... ./scripts/seed-dashboard-dev.sh
#
# ⚠️  Aponta para o backend de DEV. Não rodar contra PRD.
# ⚠️  Cria dados de teste. Para limpar depois, veja o final do arquivo.
set -euo pipefail

API="${API_BASE:-http://35.174.50.187:5055/api/v1}"
EMAIL="${API_EMAIL:?defina API_EMAIL}"
PASSWORD="${API_PASSWORD:?defina API_PASSWORD}"
JAR="$(mktemp)"
HOJE="$(date +%Y-%m-%d)"

log() { printf '\033[36m%s\033[0m\n' "$*"; }

log "Login em $API"
curl -sS -c "$JAR" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null
XSRF="$(grep XSRF-TOKEN "$JAR" | cut -f7)"

api() { # api METHOD PATH [BODY]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -b "$JAR" -c "$JAR" -X "$method" "$API$path" \
      -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $XSRF" -d "$body"
  else
    curl -sS -b "$JAR" -c "$JAR" -X "$method" "$API$path" -H "X-XSRF-TOKEN: $XSRF"
  fi
}

log "Lendo categorias"
CATS="$(api GET /categories)"
cat_id() { echo "$CATS" | python3 -c "
import sys, json
nome = sys.argv[1]
for c in json.load(sys.stdin):
    if c['name'] == nome:
        print(c['id']); break
" "$1"; }

MORADIA="$(cat_id 'Moradia')";      SAUDE="$(cat_id 'Saúde')"
ALIMENTACAO="$(cat_id 'Alimentação')"; LAZER="$(cat_id 'Lazer')"
TRANSPORTE="$(cat_id 'Transporte')"; COMPRAS="$(cat_id 'Compras')"
SALARIO="$(cat_id 'Salário')";      FREELA="$(cat_id 'Freela')"

plano() { # plano TIPO TITULO VALOR AGENDA INICIO CATEGORIA [PARCELAS]
  local extra=""
  [ -n "${7:-}" ] && extra=",\"installmentsCount\":$7"
  local freq=""
  [ "$4" = "Recurring" ] && freq=',"frequency":"Monthly"'
  api POST /plans "{\"type\":\"$1\",\"title\":\"$2\",\"amount\":$3,\"schedule\":\"$4\",\"startDate\":\"$5\",\"categoryId\":\"$6\"$freq$extra}" > /dev/null
  log "  criado: $2"
}

log "Criando recorrências (12 meses de histórico)"
plano Expense 'Aluguel'             2400.00 Recurring 2025-09-05 "$MORADIA"
plano Expense 'Plano de saúde'       892.00 Recurring 2025-09-01 "$SAUDE"
plano Expense 'Energia elétrica'     318.42 Recurring 2025-09-10 "$MORADIA"
plano Expense 'Internet e telefone'  219.90 Recurring 2025-09-15 "$MORADIA"
plano Expense 'Academia'             149.90 Recurring 2025-09-08 "$LAZER"
plano Expense 'Supermercado'         980.00 Recurring 2025-09-12 "$ALIMENTACAO"

log "Criando parcelamento"
plano Expense 'Notebook'             641.58 Installments 2026-05-12 "$COMPRAS" 12

log "Criando receita de histórico (encerra antes do Salário atual)"
plano Income  'Salário'             8400.00 Installments 2025-09-05 "$SALARIO" 9

log "Criando lançamentos dos próximos 7 dias"
D1="$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d '+1 day' +%Y-%m-%d)"
D3="$(date -v+3d +%Y-%m-%d 2>/dev/null || date -d '+3 days' +%Y-%m-%d)"
D5="$(date -v+5d +%Y-%m-%d 2>/dev/null || date -d '+5 days' +%Y-%m-%d)"
plano Income  'Consultoria'         3500.00 OneTime "$D1" "$FREELA"
plano Expense 'Seguro do carro'      641.58 OneTime "$D3" "$TRANSPORTE"
plano Expense 'Curso de inglês'      318.42 OneTime "$D5" "$MORADIA"

log "Marcando como pagas/recebidas as parcelas anteriores a hoje"
export API JAR XSRF HOJE
# O gráfico só conta receita RECEBIDA; sem este passo a linha verde fica em zero.
api GET "/installments?to=$HOJE" | python3 -c "
import sys, json, subprocess, os
API, JAR, XSRF, HOJE = os.environ['API'], os.environ['JAR'], os.environ['XSRF'], os.environ['HOJE']
itens = json.load(sys.stdin)
n = 0
for it in itens:
    if str(it.get('status','')).lower() in ('paid','canceled'):
        continue
    if str(it.get('dueDate',''))[:10] >= HOJE:
        continue
    corpo = json.dumps({'paidAmount': float(it['amount']), 'paidAt': str(it['dueDate'])[:10] + 'T12:00:00Z'})
    subprocess.run(['curl','-sS','-b',JAR,'-X','POST',f\"{API}/installments/{it['id']}/payments\",
                    '-H','Content-Type: application/json','-H',f'X-XSRF-TOKEN: {XSRF}','-d',corpo],
                   stdout=subprocess.DEVNULL)
    n += 1
print(f'  {n} parcelas quitadas')
"

log "Pronto. Recarregue o dashboard."
echo
echo "Para limpar depois, apague os planos criados em /despesas e /receitas,"
echo "ou pelo psql do VPS de DEV removendo os plans por título."
