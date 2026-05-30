# Expense Tracker API

A secure REST API for managing personal income and expenses. Built with Node.js, Express, and SQLite.

---

## Tech Stack & Why I Chose It

| Tech | Why |
|------|-----|
| **Node.js + Express** | I'm most comfortable with JavaScript. Express is simple and doesn't force too much structure, so it was easy to understand what each part does. |
| **SQLite (via sql.js)** | No need to set up a separate database server. The entire database is one file, which makes it super easy to run locally and deploy. For a personal expense tracker the data volume is small so SQLite is more than enough. |
| **JWT (jsonwebtoken)** | Standard token-based auth. I store the secret in an env variable and tokens expire after 24h. Logged-out tokens go into an `invalidated_tokens` table. |
| **bcryptjs** | Industry standard for hashing passwords. Salt rounds = 12 for a good balance of security and speed. |

---

## Project Structure

```
expense-tracker/
├── src/
│   ├── app.js                  # Entry point, Express setup
│   ├── config/
│   │   └── database.js         # SQLite setup and query helpers
│   ├── controllers/
│   │   ├── authController.js   # Register, login, logout, profile
│   │   ├── categoryController.js
│   │   ├── transactionController.js
│   │   └── analyticsController.js
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── analyticsRoutes.js
│   └── utils/
│       ├── jwt.js              # Token generation/verification
│       ├── response.js         # Consistent JSON response helpers
│       ├── validators.js       # Input validation functions
│       └── seed.js             # Sample data script
├── swagger/
│   └── swagger.yaml            # Full OpenAPI 3.0 spec
├── data/                       # Auto-created, holds expense_tracker.db
├── .env.example
├── .gitignore
└── package.json
```

---

## Local Setup

### Prerequisites
- Node.js v16 or higher
- npm

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd expense-tracker

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# 4. Start the server
npm start
```

The API will be running at **http://localhost:3000**

Swagger docs are at **http://localhost:3000/docs**

### Optional: Seed sample data

```bash
npm run seed
```

This creates two test users:
- `rahul@example.com` / `password123`
- `priya@example.com` / `password123`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Port the server listens on |
| `JWT_SECRET` | Yes | dev key | Secret used to sign JWT tokens. **Change this in production!** |
| `JWT_EXPIRES_IN` | No | `24h` | How long tokens are valid |

---

## API Overview

Base URL: `http://localhost:3000/api`

All responses follow this shape:

```json
{
  "success": true,
  "message": "Description of result",
  "data": { ... }
}
```

Errors:
```json
{
  "success": false,
  "message": "What went wrong",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT token |
| POST | `/api/auth/logout` | Yes | Invalidate token |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PUT | `/api/auth/profile` | Yes | Update name / email |
| PUT | `/api/auth/change-password` | Yes | Change password |

### Transaction Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List all (supports filters, pagination, sorting) |
| GET | `/api/transactions/:id` | Get single transaction |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

**Query params for GET /api/transactions:**
- `type` — `income` or `expense`
- `category_id` — filter by category
- `start_date`, `end_date` — date range (e.g. `2024-01-01`)
- `sort_by` — `date`, `amount`, `created_at`
- `sort_order` — `ASC` or `DESC`
- `page`, `limit` — pagination (default page=1, limit=20)

### Category Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List default + your custom categories |
| POST | `/api/categories` | Create custom category |
| PUT | `/api/categories/:id` | Update your custom category |
| DELETE | `/api/categories/:id` | Delete your custom category |

Default categories (Food, Transport, Bills, Health, Shopping, Travel, Leisure, Other) cannot be deleted.

### Analytics Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/summary` | Total income, expenses, net balance for a period |
| GET | `/api/analytics/breakdown` | Spending by category with percentages |
| GET | `/api/analytics/monthly` | Month-over-month summary |

---

## Authentication

After login or register, you get a JWT token. Pass it as a Bearer token in all protected requests:

```
Authorization: Bearer <your_token>
```

Tokens expire after 24 hours. If you call `/api/auth/logout`, the token is added to a blocklist and immediately invalidated.

---

## Security

- Passwords are hashed with bcrypt (12 rounds) — never stored as plain text
- All protected routes validate the JWT before doing anything
- Users can only access their own data — enforced at the query level (every query filters by `user_id`)
- Auth endpoints have rate limiting (20 requests per 15 minutes per IP)
- Error responses never expose stack traces or internal details

---

## Assumptions & Trade-offs

- **SQLite over PostgreSQL**: Easier to run locally with zero setup. For a production app with multiple users I'd switch to PostgreSQL.
- **sql.js (in-memory SQLite)**: The DB is loaded into memory on startup and saved to a file after every write. This works fine for small data but wouldn't scale to large datasets or concurrent writes.
- **Invalidated tokens table**: Logout blocks the specific token. I chose this over short expiry only so users can actually log out. The table could grow over time — a cleanup job would be needed in production.
- **No refresh tokens**: Tokens are valid for 24h. A production system should implement refresh tokens for better security.

---

## What I'd Improve With More Time

- Switch to PostgreSQL for production use
- Add refresh token support
- Write unit and integration tests (Jest + Supertest)
- Add email verification on registration
- Containerize with Docker for easier deployment
- Add more detailed analytics (weekly summaries, year-over-year)
- Implement soft deletes so data can be recovered

---

## Deployment

The API can be deployed to [Render](https://render.com) or [Railway](https://railway.app) for free:

1. Push code to GitHub
2. Connect repo on Render/Railway
3. Set environment variables (`JWT_SECRET`, `PORT`)
4. Deploy — Swagger docs will be live at `<your-url>/docs`
