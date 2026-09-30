# Use Node.js 18 as the base image
FROM node:18-slim

# Install Python3 and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only, exactly as locked
RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Run node directly: npm as PID 1 adds boot time to every cold start and sits
# between Cloud Run's SIGTERM and the server's graceful shutdown.
CMD ["node", "server.js"]
