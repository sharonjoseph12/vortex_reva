# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies including those required by Playwright and Docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    gnupg \
    libpq-dev \
    gcc \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI so the container can trigger sandbox containers on the host daemon
RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh

# Install Python dependencies
COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium for the Godmode App Verification
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy project files
COPY . .

# Create a non-root user for security, BUT we need root to access docker.sock for the sandbox
# We stick to root here because Docker sandbox creation inside this container requires it.

# Expose port (Cloud providers inject PORT env variable)
EXPOSE 8000

# Entrypoint script creates the necessary startup based on ROLE env variable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
