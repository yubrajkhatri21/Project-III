FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy ML folder contents
COPY . /app

# Upgrade pip and install requirements
RUN python -m pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Default command runs training
CMD ["python", "train_model.py"]
