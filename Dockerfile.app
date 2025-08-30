FROM node:20-alpine AS deps
WORKDIR /app

# Copy only the package files
COPY package*.json ./

# Install dependencies
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

# Copy the source files
COPY src/ ./src/

# Copy lib and common to maintain the expected directory structure
COPY lib/ ./lib/
COPY common/ ./common/

# Copy package files and tsconfig
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Run build from analytics directory
WORKDIR /app
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Copy the bundled code from the builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Use the node user from the image
USER node

# Start the server
CMD ["node", "dist/src/main.js"]
