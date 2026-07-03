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
    infrastructure/cache/        # Cache persistente em disco
    interfaces/http/controllers/ # Controllers HTTP
    interfaces/http/middleware/  # Middlewares HTTP
    interfaces/http/routes/      # Rotas Express
    interfaces/http/schemas/     # Validacao de request com Zod
    shared/                      # Erros e logger
    utils/                       # Utilitarios de catalogo/itens
    app.ts                       # Composicao do app Express
    main.ts                      # Bootstrap do servidor
frontend/
  src/                           # UI React/Vite
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

O backend sobe em `http://localhost:3000`.
A documentacao Swagger fica em `http://localhost:3000/docs`.

## Configuracao

As variaveis do backend ficam em `backend/.env`. Use `backend/.env.example` como base.

## Endpoints Principais

- `GET /health`: status do backend, cache e Albion Data.
- `GET /api/cities`: cidades suportadas.
- `GET /api/prices/:itemId`: precos atuais por item.
- `GET /api/history/:itemId`: historico de precos.
- `GET /api/gold`: historico de ouro.
- `GET /api/items/search?q=bag`: busca no catalogo de itens.
- `GET /api/crafting/:itemId`: receita real de crafting.
- `POST /api/market/snapshot`: snapshot de mercado.
- `POST /api/market/opportunities`: ranking de oportunidades.
