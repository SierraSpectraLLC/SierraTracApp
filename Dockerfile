FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create upload directory for dev fallback
RUN mkdir -p static/uploads

# Expose port
EXPOSE 8000

# Make startup script executable
RUN chmod +x startup.sh

# Run migrations then start Gunicorn
CMD ["/bin/bash", "startup.sh"]
