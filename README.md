# Cada Lado Noticias

**La misma noticia, todas las voces. Sin que te vendan humo.**

Plataforma de síntesis neutral de noticias argentinas. Scrapeamos 8 medios, agrupamos noticias sobre el mismo hecho y usamos IA para generar una síntesis imparcial + análisis de qué enfatiza y omite cada medio.

## Medios cubiertos

| Medio | Inclinación |
|-------|-------------|
| Clarín | Centro-derecha |
| La Nación | Centro-derecha |
| Infobae | Centro |
| Página 12 | Izquierda |
| Ámbito | Centro |
| El Cronista | Centro |
| Perfil | Centro |
| La Izquierda Diario | Izquierda |

## Stack técnico

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy async
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Base de datos:** PostgreSQL 16
- **IA:** Claude API (claude-sonnet-4-6)
- **Scraping:** httpx + feedparser (RSS) + BeautifulSoup4
- **Clustering:** scikit-learn TF-IDF + cosine similarity
- **Deploy:** Docker Compose

## Instalación rápida

### 1. Clonar y configurar

```bash
git clone <repo>
cd Cada-Lado-Noticias
cp .env.example .env
# Editá .env y poné tu ANTHROPIC_API_KEY
```

### 2. Levantar con Docker

```bash
docker compose up --build
```

Eso levanta:
- PostgreSQL en `localhost:5432`
- Backend API en `http://localhost:8000`
- Frontend en `http://localhost:3000`

### 3. Primer scraping

El scraping automático corre a las 7am, 1pm y 7pm (hora Argentina).
Para correrlo manualmente:

```bash
curl -X POST http://localhost:8000/api/scrape
```

O desde la UI de la API: `http://localhost:8000/docs`

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

## Arquitectura del pipeline

```
Scrapers (RSS) → RawArticles (DB)
                         ↓
              TF-IDF Clustering
                         ↓
              Claude AI Synthesis
                         ↓
              NewsCluster + ClusterArticles (DB)
                         ↓
              Next.js Frontend
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic (requerida) |
| `DATABASE_URL` | PostgreSQL async URL |
| `BACKEND_CORS_ORIGINS` | Orígenes permitidos para CORS |
| `CLUSTERING_THRESHOLD` | Umbral similitud para clustering (default: 0.35) |

## API endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/news` | Listado paginado de clusters |
| `GET /api/news/{id}` | Detalle de un cluster |
| `GET /api/sources` | Lista de medios |
| `GET /api/categories` | Categorías con conteo |
| `GET /api/stats` | Estadísticas generales |
| `POST /api/scrape` | Disparar scraping manual |
| `GET /health` | Health check |

## Contribuir

PR bienvenidos. El proyecto está pensado para crecer con:
- Más medios (INDEC para datos duros, medios provinciales)
- Mejor clustering semántico (embeddings)
- Notificaciones push de breaking news
- Historial y buscador
