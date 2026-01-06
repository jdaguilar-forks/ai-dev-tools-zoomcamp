# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install Docker CLI (to communicate with host Docker daemon)
RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/environments ./environments

EXPOSE 3001

CMD ["node", "dist/index.js"]
