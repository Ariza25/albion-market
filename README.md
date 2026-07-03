# Albion Market

Aplicacao para consultar mercado, crafting, snapshots e oportunidades usando dados da Albion Online Data Project API.

## Estrutura

```text
backend/
  src/
    application/services/        # Casos de uso e regras de aplicacao
    config/                      # Configuracao e variaveis de ambiente
    infrastructure/cache/        # Cache persistente em disco
    interfaces/http/middleware/  # Middlewares HTTP
    interfaces/http/routes/      # Rotas Express
    utils/                       # Utilitarios de catalogo/itens
    app.js                       # Composicao do app Express
    main.js                      # Bootstrap do servidor
frontend/
  src/                           # UI React/Vite
```

## Comandos

```bash
# Backend
npm run dev:backend
npm run start:backend

# Frontend
npm run dev:frontend
npm run build:frontend
npm run lint:frontend
```

O backend sobe em `http://localhost:3000`.
A documentacao Swagger fica em `http://localhost:3000/docs`.

## Configuracao

As variaveis do backend ficam em `backend/.env`. Use `backend/.env.example` como base.

Principais variaveis:

```env
PORT=3000
ALBION_SERVER=europe
DEFAULT_LOCATIONS=Caerleon,Bridgewatch,Lymhurst,Fort Sterling,Thetford,Martlock,Brecilien
PERSISTENT_CACHE=true
PERSISTENT_CACHE_DIR=.cache/albion-data
CACHE_TTL_PRICES=300
CACHE_TTL_HISTORY=3600
CACHE_TTL_GOLD=600
CACHE_TTL_CRAFTING=86400
```

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
