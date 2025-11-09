# TryItAI Deployment Guide

## Pre-Deployment Checklist

### ✅ 1. Repository Setup
- [x] package.json with `start` script
- [x] Health check endpoint: `/api/health`
- [x] Environment variables documented in `.env.example`
- [x] Code pushed to GitHub: https://github.com/HonestImpact/TryItAIagentic

### ✅ 2. Build Configuration

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

**Port:** 3000 (configured in package.json)

### ✅ 3. Required Environment Variables

**Minimum required for deployment:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
MODEL_ID=claude-sonnet-4-20250514
LLM=anthropic
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

**Optional but recommended:**
```bash
RAG_ENABLED=false  # Set to false if not using ChromaDB
ENABLE_ANALYTICS=true
ENABLE_LEARNING=true
```

### ✅ 4. Health Check Endpoint

**URL:** `/api/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T00:00:23.113Z",
  "service": "TryItAI - Noah",
  "version": "2.0.0",
  "database": "connected"
}
```

Koyeb will use this endpoint to verify the service is running.

---

## Deployment Steps (Koyeb)

1. **Connect Repository**
   - Repository: `HonestImpact/TryItAIagentic`
   - Branch: `main`

2. **Configure Build**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: `3000`

3. **Set Environment Variables**
   - Add all required variables from `.env.example`
   - Particularly important: `ANTHROPIC_API_KEY`, `DATABASE_URL`

4. **Configure Health Check**
   - Path: `/api/health`
   - Port: `3000`
   - Initial delay: `30s` (for cold starts)
   - Interval: `30s`

5. **Enable Scale-to-Zero**
   - Recommended for development/testing
   - Cold start: ~10-20 seconds
   - Noah's presence makes cold starts feel intentional

---

## Database Setup

### PostgreSQL
You'll need a PostgreSQL database. Options:
- **Neon** (scale-to-zero Postgres)
- **Supabase** (free tier available)
- **Railway** (Postgres included)

### Schema Migration
Once database is provisioned:
```bash
# Run migrations (if needed)
psql $DATABASE_URL < migrations/001_create_workflow_memories.sql
```

### Optional: ChromaDB
For RAG features, you can:
- Set `RAG_ENABLED=false` for simpler deployment
- Or host ChromaDB separately and set `CHROMA_URL`

---

## Testing After Deployment

### 1. Health Check
```bash
curl https://your-app.koyeb.app/api/health
```

### 2. Main App
Visit `https://your-app.koyeb.app` - should see Noah's UI

### 3. First Conversation
Say "Hello?" and verify Noah responds with foundational identity:
- Should say "Hello. What's on your mind?" (not launch into introduction)
- Should be present, curious, not performative

---

## Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Verify all dependencies in package.json

### App Won't Start
- Check logs for environment variable errors
- Verify `ANTHROPIC_API_KEY` is set
- Check `DATABASE_URL` is correct

### Health Check Fails
- Verify port 3000 is exposed
- Check `/api/health` endpoint is accessible
- Database connection issues won't fail health check (graceful degradation)

### Cold Starts Are Slow
- Expected behavior with scale-to-zero
- Noah's personality handles this well ("I wait. I listen.")
- Consider keeping instance warm for production

---

## Post-Deployment

### Monitor
- Watch Koyeb logs for errors
- Check health endpoint periodically
- Monitor database connections

### Performance
- First request: ~10-20s (cold start)
- Subsequent: 2-4s (fast path) or 15-180s (agentic work)
- Database queries: minimal impact with connection pooling

---

Ready to deploy! 🚀
