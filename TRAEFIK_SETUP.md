# Setup Traefik (Frontend + API)

## 1) DNS
- Crie os apontamentos A/AAAA:
  - `app.seudominio.com` -> IP da VPS
  - `api.seudominio.com` -> IP da VPS

## 2) Variáveis de ambiente

No repositório **InvestindoEmNegociosWeb** (`/Users/henriquesantos/Desktop/Codes/InvestindoEmNegociosWeb/.env`):

```env
LETSENCRYPT_EMAIL=seu-email@dominio.com
FRONTEND_HOST=app.seudominio.com
API_HOST=api.seudominio.com
```

No repositório **InvestindoEmNegocio** (`/Users/henriquesantos/Desktop/Codes/InvestindoEmNegocio/.env`), adicione também:

```env
API_HOST=api.seudominio.com
```

## 3) Subir frontend + Traefik

```bash
cd /Users/henriquesantos/Desktop/Codes/InvestindoEmNegociosWeb
docker compose pull
docker compose up -d
```

## 4) Subir backend

```bash
cd /Users/henriquesantos/Desktop/Codes/InvestindoEmNegocio
docker compose pull
docker compose up -d
```

## 5) Validar

```bash
curl -I https://app.seudominio.com
curl -I https://api.seudominio.com/health/ready
```

## Notas
- O Traefik cria/renova TLS automaticamente com Let's Encrypt.
- O frontend já usa `API_BASE_URL=https://${API_HOST}/api/v1`.
- Se quiser bloquear acesso direto ao backend, depois remova a porta `5059:5059` do serviço `backend`.
