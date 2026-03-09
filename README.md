# SierraTrac — Instrument Lifecycle Platform

A Flask-based web application for tracking analytical instrument service history, condition verification, and consignment management.

## Project Structure

```
sierratrac/
├── app.py                  # Flask application factory + entry point
├── config.py               # Configuration (DB, Azure, env-based)
├── models.py               # SQLAlchemy models (Instrument, ServiceRecord, Photo, User)
├── routes.py               # Web routes + JSON API endpoints
├── storage.py              # Photo upload service (Azure Blob / local filesystem)
├── seed.py                 # Demo data seeder
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container build
├── .env.example            # Environment variable template
├── .gitignore
│
├── templates/
│   ├── base.html           # Shared layout (meta tags, fonts, CSS)
│   ├── index.html          # Search landing page
│   ├── instrument.html     # Instrument detail + service history
│   ├── not_found.html      # No record found + action cards
│   ├── register.html       # Self-registration form
│   └── register_success.html
│
├── static/
│   ├── css/
│   │   └── style.css       # All styles (mobile-first, IBM Plex)
│   ├── js/                 # (future client-side scripts)
│   ├── img/                # (logos, icons)
│   └── uploads/            # Local photo storage (dev only)
│
└── migrations/             # Flask-Migrate (auto-generated)
```

## Local Development Setup

### 1. Prerequisites

- Python 3.10+
- PostgreSQL 14+

### 2. Create the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE sierratrac;
CREATE USER sierratrac WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE sierratrac TO sierratrac;
\q
```

### 3. Set up the project

```bash
# Clone and enter the project
cd sierratrac

# Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Initialize the database

```bash
# Create tables
python -c "from app import create_app; create_app()"

# Seed with demo data
python seed.py
```

### 5. Run locally

```bash
python app.py
# Open http://localhost:5000
```

## Hosting Options

### Option A: Railway (Recommended for starting out)

Railway gives you a PostgreSQL database and web hosting in one place. Easiest path from zero to live.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Deploy
railway up
```

**Cost:** Free tier available. ~$5/month for low traffic.

**Why Railway:** One command deploys both the app and the database. No Docker knowledge needed. Automatic HTTPS. Environment variables managed in their dashboard.

### Option B: Render

Similar to Railway. Free PostgreSQL (90 days), then $7/month.

1. Push code to GitHub
2. Go to render.com → New Web Service
3. Connect your repo
4. Set environment variables in Render dashboard
5. Add a PostgreSQL database from Render
6. Set `DATABASE_URL` to the Render-provided connection string

### Option C: Azure App Service + Azure Database for PostgreSQL

Best if Joe wants everything in the Microsoft ecosystem (especially since he mentioned Azure for photos).

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name sierratrac-rg --location westus2

# Create PostgreSQL server
az postgres flexible-server create \
    --resource-group sierratrac-rg \
    --name sierratrac-db \
    --admin-user sierratrac \
    --admin-password <YOUR_PASSWORD> \
    --sku-name Standard_B1ms \
    --tier Burstable

# Create the database
az postgres flexible-server db create \
    --resource-group sierratrac-rg \
    --server-name sierratrac-db \
    --database-name sierratrac

# Create App Service
az webapp up \
    --resource-group sierratrac-rg \
    --name sierratrac-app \
    --runtime "PYTHON:3.12" \
    --sku B1

# Set environment variables
az webapp config appsettings set \
    --resource-group sierratrac-rg \
    --name sierratrac-app \
    --settings \
        FLASK_ENV=production \
        SECRET_KEY=<GENERATE_A_RANDOM_KEY> \
        DATABASE_URL="postgresql://sierratrac:<PASSWORD>@sierratrac-db.postgres.database.azure.com:5432/sierratrac" \
        AZURE_STORAGE_CONNECTION_STRING="<YOUR_CONNECTION_STRING>" \
        AZURE_CONTAINER_NAME="instrument-photos"
```

**Cost:** ~$25-40/month (App Service B1 + Postgres Burstable).

### Option D: DigitalOcean App Platform

Good middle ground. $12/month for app + $15/month for managed Postgres.

1. Push to GitHub
2. Create App on DigitalOcean App Platform
3. Add managed PostgreSQL as component
4. Set env vars in the dashboard

## Photo Storage Setup

### Development (Local)

Photos save to `static/uploads/` automatically. No configuration needed.

### Production (Azure Blob Storage)

```bash
# Create storage account
az storage account create \
    --name sierratracphotos \
    --resource-group sierratrac-rg \
    --location westus2 \
    --sku Standard_LRS

# Create container
az storage container create \
    --name instrument-photos \
    --account-name sierratracphotos \
    --public-access blob

# Get connection string
az storage account show-connection-string \
    --name sierratracphotos \
    --resource-group sierratrac-rg
```

Set `AZURE_STORAGE_CONNECTION_STRING` in your environment with the output.

### Alternative: Firebase Storage

If you prefer Firebase over Azure, swap out `storage.py` to use the `firebase-admin` SDK instead of `azure-storage-blob`. The interface is nearly identical — upload blob, get URL, store URL in Postgres.

## Database Migrations

When you change models:

```bash
# Generate migration
flask db migrate -m "description of change"

# Apply migration
flask db upgrade
```

## API Endpoints

The app includes a JSON API alongside the web UI:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=<serial>` | Search by S/N or model |
| GET | `/api/instruments/<id>` | Get instrument by SierraTrac ID |
| POST | `/api/instruments` | Register new instrument |
| POST | `/api/instruments/<id>/records` | Add service record |
| POST | `/api/service-requests` | Submit service request (lab tech) |
| GET | `/api/service-requests?status=pending` | List service requests |
| POST | `/api/service-requests/<id>/resolve` | Confirm/dismiss with GLP explanation |

## Database Models

| Model | Description |
|-------|-------------|
| `Instrument` | Core instrument record. Linked to system via `system_id`. |
| `System` | A coupled stack of instruments (e.g. UPLC stack). |
| `SystemSwap` | Log of module couple/decouple events within a system. |
| `ServiceRecord` | Service event (inspection, PM, repair, qualification). |
| `ServiceRequest` | Lab tech service request. Requires ISO confirm/dismiss with GLP explanation. |
| `Photo` | Image stored in Azure Blob (or local). Linked to instrument and/or service record. |
| `User` | Team members. Roles: admin, engineer, seller, buyer, viewer. |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FLASK_ENV` | Yes | `development` or `production` |
| `SECRET_KEY` | Yes | Random string for session security |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AZURE_STORAGE_CONNECTION_STRING` | Prod only | Azure Blob access |
| `AZURE_CONTAINER_NAME` | Prod only | Blob container name |

## Next Steps

- [ ] QR code generation (link to instrument page)
- [ ] PDF export of service reports and IQ/OQ certificates
- [ ] Email/SMS notifications on new service requests
- [ ] Bulk import from CSV/Excel
- [ ] OEM channel partner portal
- [ ] Custom domain + SSL (handled by hosting provider)
