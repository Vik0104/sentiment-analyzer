# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Judge.me Sentiment Analyzer SaaS - AI-powered sentiment analysis of e-commerce product reviews, integrated with Judge.me OAuth.

**Stack**:

- **Backend**: FastAPI + Supabase + Stripe (deployed to Railway)
- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui + Recharts (deployed to Vercel)

## Common Commands

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Download NLTK data (first-time setup)
python -c "import nltk; nltk.download('vader_lexicon')"

# Run FastAPI server (development)
uvicorn app.main:app --reload --port 8080

# Run with Docker
docker build -t sentiment-analyzer .
docker run -p 8080:8080 --env-file .env sentiment-analyzer
```

API runs at `http://localhost:8080`. Docs at `/docs`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Frontend runs at `http://localhost:3000`.

## Architecture

### Project Structure

```
├── app/                        # FastAPI Backend
│   ├── main.py                 # FastAPI entry point, lifespan, routes
│   ├── core/
│   │   ├── config.py           # Pydantic settings from env vars
│   │   ├── security.py         # JWT tokens, encryption
│   │   └── dependencies.py     # FastAPI DI (auth, tier verification)
│   ├── api/v1/
│   │   ├── routes/             # auth.py, analysis.py, billing.py
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── webhooks/stripe.py  # Stripe webhook handlers
│   ├── services/               # judgeme.py, analysis.py, stripe_service.py
│   ├── nlp/                    # sentiment.py, topics.py, aspects.py, analytics.py
│   └── db/supabase.py          # Database operations
│
└── frontend/                   # Next.js Frontend
    └── src/
        ├── app/                # App Router pages
        │   ├── page.tsx        # Landing page
        │   ├── auth/callback/  # OAuth callback
        │   ├── dashboard/      # Main dashboard + sub-pages
        │   ├── settings/       # Account settings
        │   └── billing/        # Subscription management
        ├── components/         # UI components (shadcn/ui + custom)
        └── lib/                # API client, hooks, types, auth context
```

### API Endpoints

**Auth:**
- `GET /auth/judgeme/authorize` - Get OAuth URL
- `GET /auth/judgeme/callback` - OAuth callback
- `GET /auth/me` - Current user info

**Analysis:**
- `GET /api/v1/analysis/dashboard` - Full analysis
- `GET /api/v1/analysis/sentiment` - Sentiment only (free tier)
- `GET /api/v1/analysis/aspects` - Aspect analysis (starter+)
- `GET /api/v1/analysis/topics` - Topic extraction (starter+)
- `GET /api/v1/analysis/trends` - Trends (starter+)
- `GET /api/v1/analysis/export` - CSV/JSON export (pro)

**Billing:**
- `GET /api/v1/billing/status` - Subscription status
- `POST /api/v1/billing/checkout` - Create checkout session
- `GET /api/v1/billing/plans` - Available plans

### NLP Pipeline

```
Judge.me Reviews → JudgemeService.normalize_reviews()
    → AnalysisService.run_full_analysis()
        → SentimentAnalyzer (VADER + e-commerce lexicon)
        → TopicExtractor (TF-IDF + NMF)
        → AspectAnalyzer (industry-specific)
        → AnalyticsEngine (trends, drivers)
    → JSON Response
```

## Environment Variables

Required in `.env`:
- `SECRET_KEY` - JWT signing key (32+ chars)
- `JUDGEME_CLIENT_ID`, `JUDGEME_CLIENT_SECRET`, `JUDGEME_REDIRECT_URI`
- `SUPABASE_URL`, `SUPABASE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

See `.env.example` for full list.

## Deployment

**Railway:**
```bash
railway login
railway init
railway up
```

Configuration in `railway.json`. Dockerfile included.

## Key Implementation Details

- NLP models loaded once at startup via FastAPI lifespan
- CPU-bound analysis runs in ThreadPoolExecutor for async compatibility
- Analysis results cached in Supabase with configurable TTL
- Tier-based feature gating via `require_tier()` dependency
- Judge.me tokens encrypted at rest with Fernet
