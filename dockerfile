FROM node:18-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && ln -sf python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Set environment variables
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies with legacy peer deps and force flag
RUN npm install --legacy-peer-deps --force

# Copy application code
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
