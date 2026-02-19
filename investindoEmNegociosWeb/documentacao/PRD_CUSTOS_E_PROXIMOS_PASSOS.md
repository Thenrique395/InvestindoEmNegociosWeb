# PRD: Custos e Próximos Passos (Infra, Negócio e Qualidade)

## Objetivo
Este documento resume:
- custo estimado para colocar o produto em produção;
- checklist técnico para subir com segurança;
- passos de negócio e operação para lançamento real.

---

## 1) Custos estimados

## 1.1 Infra (mensal)
- VPS (app + API + banco no mesmo host): **US$ 15 a US$ 40/mês** (MVP).
- VPS com folga (mais CPU/RAM): **US$ 40 a US$ 80/mês**.
- Banco gerenciado (opcional): **US$ 15 a US$ 150+/mês**.
- Backup externo/snapshots: **US$ 5 a US$ 30/mês**.
- Monitoramento/logs (Sentry/Grafana Cloud): **US$ 0 a US$ 50+/mês**.
- E-mail transacional (reset senha/notificações): **US$ 0 a US$ 25/mês**.

## 1.2 Custos anuais
- Domínio `.com`: **US$ 10 a US$ 20/ano**.
- Domínio `.com.br`: **R$ 40 a R$ 60/ano**.
- SSL/TLS: **US$ 0** (Let's Encrypt + Traefik).

## 1.3 Faixa total
- MVP econômico: **US$ 15 a US$ 40/mês** + domínio.
- PRD mais robusto: **US$ 60 a US$ 200+/mês**.

---

## 2) Próximos passos técnicos para PRD

## 2.1 Infra e deploy
- [ ] Definir domínio oficial (`.com` ou `.com.br`) quando sair de teste.
- [ ] Manter Traefik + HTTPS automático com Let's Encrypt.
- [ ] Remover exposição pública direta da API (`5059`) e manter acesso via Traefik.
- [ ] Separar ambientes: `staging` e `production`.
- [ ] Configurar pipeline CI/CD com rollback simples (última imagem estável).
- [ ] Versionar imagens por tag (evitar depender só de `latest`).

## 2.2 Banco e dados
- [ ] Backup diário automático + política de retenção (ex.: 7/30 dias).
- [ ] Teste de restauração mensal (backup sem restore não é confiável).
- [ ] Validar índices em endpoints críticos (`positions`, `notifications`, `profile`, export/import).
- [ ] Plano de migração segura para mudanças de schema.

## 2.3 Segurança
- [ ] Segredos fora do repositório (GitHub Secrets / Secret Manager).
- [ ] Rotacionar chaves JWT e tokens periodicamente.
- [ ] Rate limit para login, export/import e endpoints de alto custo.
- [ ] Headers de segurança (HSTS, X-Content-Type-Options, etc.).
- [ ] Política de acesso mínimo (SSH, portas, usuários, permissões).

---

## 3) Testes e qualidade (obrigatório antes de go-live)

## 3.1 Frontend
- [ ] `npm run quality:frontend` em toda release.
- [ ] Lighthouse CI com meta mínima (performance/acessibilidade/best practices).
- [ ] E2E dos fluxos críticos: login, dashboard, despesas, investimentos, importação.
- [ ] Monitoramento de Web Vitals em produção.

## 3.2 Backend
- [ ] Testes de integração para endpoints críticos.
- [ ] Teste de carga k6 para baseline (read/load e export/import).
- [ ] Alertas por p95/p99, taxa de erro, CPU, memória e restart de containers.
- [ ] Health checks validados no deploy e pós-deploy.

## 3.3 Critérios mínimos de release
- [ ] Sem erro crítico em smoke test.
- [ ] `http_req_failed` dentro da meta definida.
- [ ] p95 dos endpoints principais dentro do limite acordado.
- [ ] Rollback testado na prática.

---

## 4) Passos de negócio para lançamento

- [ ] Definir ICP (cliente ideal) e proposta de valor principal.
- [ ] Definir pricing inicial (ex.: Basic, Intermediate, Advanced).
- [ ] Definir termos, política de privacidade e suporte.
- [ ] Preparar onboarding e conteúdo de ativação (primeiros 7 dias).
- [ ] Definir canais de aquisição inicial (orgânico, comunidades, parceiros, tráfego pago).
- [ ] Definir indicadores de negócio:
  - ativação (cadastro -> primeiro lançamento);
  - retenção (D7/D30);
  - conversão free -> pago;
  - churn;
  - ticket médio.

---

## 5) Plano recomendado (execução em etapas)

## Etapa A - Estabilização técnica (1-2 semanas)
- Fechar performance crítica de API e telas mais usadas.
- Finalizar observabilidade e alertas.
- Validar backup + restore.

## Etapa B - Pré-produção (1 semana)
- Rodar carga de baseline + smoke automatizado.
- Simular incidente simples e rollback.
- Congelar mudanças não essenciais.

## Etapa C - Go-live controlado
- Liberar para grupo pequeno.
- Medir métricas por 7 dias.
- Corrigir gargalos e só depois escalar aquisição.

---

## 6) Checklist final de go-live

- [ ] Domínio e TLS válidos.
- [ ] Ambiente com variáveis corretas.
- [ ] Backup agendado e restore testado.
- [ ] CI/CD com deploy e rollback.
- [ ] Logs, métricas e alertas ativos.
- [ ] Testes críticos passando (frontend e backend).
- [ ] Documento de incidentes (quem aciona, como reverte, onde olhar).

