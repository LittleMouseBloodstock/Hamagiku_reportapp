# Use official Node.js image
FROM node:18-slim

# Install dependencies for Puppeteer (Chrome)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnss3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY backend .

# Expose port (Cloud Run sets PORT env var)
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "index.js"]
