# Site Clearance

Standalone ERCOT site-clearance tool: draw a polygon, score generation or large-load MW against county-resolution queue pressure, peer timelines, and market stress.

**Plan:** `../site-clearance-plan.md`  
**Domain (planned):** clearance.kardashevlabs.org  
**API:** `POST /clearance/score` on kardashev-data

## Local

```bash
# API (kardashev-data) must be running with DATABASE_URL set
cd ../kardashev-data
uvicorn api.main:app --host 127.0.0.1 --port 8000

# Frontend
cd ../site-clearance/web
cp .env.local.example .env.local   # or use existing .env.local
npm install
npm run dev
```

Open http://localhost:3000
