# Albion Market

Aplicacao para consultar mercado, crafting, snapshots e oportunidades usando dados da Albion Online Data Project API.

## Estrutura

```text
backend/
  src/
    application/repositories/    # Portas de acesso a dados externos
    application/services/        # Servicos de dominio/aplicacao
    application/use-cases/       # Casos de uso chamados pelos controllers
    config/                      # Configuracao e variaveis de ambiente
    interfaces/http/controllers/ # Controllers HTTP
    interfaces/http/middleware/  # Middlewares HTTP
    interfaces/http/routes/      # Rotas Express
    interfaces/http/schemas/     # Validacao de request com Zod
    shared/                      # Erros e logger
    utils/                       # Utilitarios de catalogo/itens
    app.ts                       # Composicao do app Express
    main.ts                      # Bootstrap do servidor
frontend/
  src/                           # UI React/Vite em TypeScript
```

## Comandos

```bash
# Backend
npm run dev:backend
npm run build:backend
npm run start:backend
npm run test:backend

# Frontend
npm run dev:frontend
npm run build:frontend
npm run lint:frontend
```

O build do frontend executa `tsc --noEmit` antes do Vite, entao erros de TypeScript quebram o build.

## Docker e CI

As imagens Docker ficam em `backend/Dockerfile` e `frontend/Dockerfile`.

```bash
docker build -t albion-market-backend:local backend
docker build -t albion-market-frontend:local frontend
docker compose up --build
```

Com `docker compose`, o frontend fica em `http://localhost:8080` e o backend em `http://localhost:3000`.

O workflow `.github/workflows/ci.yml` roda build/test do backend, build/lint/typecheck do frontend e valida o build das duas imagens Docker.

O backend sobe em `http://localhost:3000`.
A documentacao Swagger fica em `http://localhost:3000/docs`.

## Configuracao

As variaveis do backend ficam em `backend/.env`. Use `backend/.env.example` como base.

Para receber dados quase em tempo real do Albion Data NATS enquanto o backend estiver ligado:

```env
ALBION_NATS_ENABLED=true
ALBION_NATS_URL=nats://public:thenewalbiondata@nats.albion-online-data.com:4222
ALBION_NATS_TOPIC=marketorders.deduped
```

Esses dados ficam em memoria e têm prioridade sobre a REST API nos snapshots. Depois que o backend reinicia, o store local começa vazio novamente.

## Endpoints Principais

- `GET /health`: status do backend e Albion Data.
- `GET /api/cities`: cidades suportadas.
- `GET /api/prices/:itemId`: precos atuais por item.
- `GET /api/history/:itemId`: historico de precos.
- `GET /api/gold`: historico de ouro.
- `GET /api/items/search?q=bag`: busca no catalogo de itens.
- `GET /api/crafting/:itemId`: receita real de crafting.
- `POST /api/market/snapshot`: snapshot de mercado.
- `POST /api/market/opportunities`: ranking de oportunidades.
