# 🚀 Deploy a Vercel

## Prerequisitos

- Cuenta en Vercel (vercel.com)
- Repositorio GitHub conectado
- PostgreSQL database (recomendado: Vercel Postgres)

## Pasos de Deploy

### 1. Conectar Repositorio en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en "Add New..." → "Project"
3. Importa este repositorio GitHub
4. Vercel detectará automáticamente:
   - Framework: **Next.js**
   - Root Directory: **frontend/** (deselecciona si Vercel lo preselecciona, o déjalo, ya que tenemos configs en raíz)

### 2. Configurar Variables de Entorno

En Vercel Project Settings → Environment Variables, agrega:

```env
DATABASE_URL=postgresql://...your-postgres-url...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
CRON_SECRET=your-random-secret-token-here
NEXT_PUBLIC_API_URL=https://tu-proyecto.vercel.app
```

⚠️ **Importante:**
- `DATABASE_URL`: Usa una URL de PostgreSQL válida
- `CRON_SECRET`: Verifica este token en los logs para evitar acceso no autorizado
- El CRON_SECRET es opcional pero recomendado

### 3. Deploy

1. Haz push de tus cambios al repo
2. Vercel deployará automáticamente
3. El build ejecutará:
   - `npm ci` en `/frontend`
   - `npm run vercel-build` que:
     - Ejecuta migrations de Drizzle (`db:push`)
     - Compila Next.js (`next build`)

### 4. Verificar Deploy

Una vez deployed:

```bash
# Health check
curl https://tu-proyecto.vercel.app/api/health

# Forzar scraping manual (opcional)
curl -X GET https://tu-proyecto.vercel.app/api/scrape \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Cron Job Automático

El cron está configurado en `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/scrape",
    "schedule": "0 0 * * *"  // Diariamente a las 00:00 UTC
  }
]
```

Para cambiar el horario, edita `vercel.json` y haz push.

## Databases Recomendadas

### Opción 1: Vercel Postgres (Recomendado)
- Integración nativa con Vercel
- Backups automáticos
- Free tier disponible

Pasos:
1. En Vercel Project → Storage → Create Database → Postgres
2. Copia la `DATABASE_URL` de la integración
3. Pégala en Environment Variables

### Opción 2: Railway, Supabase, NeonDB
- Soportan PostgreSQL estándar
- Copia la connection string y usa como `DATABASE_URL`

## Troubleshooting

### Build falla con "DATABASE_URL is not set"
→ Verifica que la variable está en Vercel Project Settings

### Cron no se ejecuta
→ Vé a Project Settings → Cron Jobs y verifica que esté enabled

### Errores de conexión a DB en producción
→ Asegúrate que tu firewall/VPC permite conexiones desde Vercel IPs

### Drizzle migrations fallan
→ Los migrations se ejecutan en `npm run vercel-build`
→ Si hay error, revisa los logs del build en Vercel Dashboard

## Desarrollo Local

```bash
# 1. Setup env
cp .env.example .env.local

# 2. Instalar deps
cd frontend
npm install

# 3. Migrations (si es primera vez)
npm run db:push

# 4. Dev server
npm run dev
```

## APIs Disponibles

Después del deploy, tendrás:

- `GET /api/health` - Health check
- `GET /api/news?page=1` - Listado de noticias
- `GET /api/news/[id]` - Detalle noticia
- `GET /api/sources` - Listado de medios
- `GET /api/categories` - Categorías
- `GET /api/stats` - Estadísticas
- `POST /api/scrape` - Disparar scraping (requiere auth)
- `GET /api/cron/scrape` - Cron endpoint (uso interno)

## Performance Tips

1. **Vercel Cron**: Si necesitas scraping más frecuente, upgrade a plan pago (máx 10 crons en hobby)
2. **Database**: Optimiza conexiones con `max: 1` en pool size (ya configurado)
3. **Static Generation**: Las páginas se regeneran on-demand

---

¿Necesitas ayuda? Revisa los logs en Vercel Dashboard o contacta al team.
