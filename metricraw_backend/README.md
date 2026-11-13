# MetricRaw Django Backend

## Setup
1. Create MySQL database: `CREATE DATABASE metricraw CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. `python -m venv venv`
3. Activate venv.
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and set DB credentials.
6. `python manage.py makemigrations`
7. `python manage.py migrate`
8. `python manage.py createsuperuser`
9. `python seed.py`
10. `python manage.py runserver`

## JWT
POST `/api/auth/login/` with username/password. Use `Authorization: Bearer ACCESS_TOKEN`.

## Main endpoints
POST `/api/register/`
GET/PUT `/api/profile/`
GET/POST `/api/goals/`
GET `/api/exercises/`
POST `/api/workouts/generate/`
GET `/api/workouts/`
GET/POST `/api/progress/`
GET `/api/progress/summary/`
POST `/api/ai/chat/`
POST `/api/nutrition/suggestions/`
GET `/api/products/`
GET `/api/cart/`
POST `/api/cart/items/`
POST `/api/orders/create/`
GET/POST `/api/recommendations/`

The AI chat endpoint works with a rule-based fallback. If `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` are configured, it attempts an OpenAI-compatible chat endpoint. Never expose the API key to React.
