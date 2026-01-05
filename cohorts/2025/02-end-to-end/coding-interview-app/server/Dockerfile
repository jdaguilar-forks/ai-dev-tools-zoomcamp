FROM node:18-alpine

WORKDIR /app

# Install Docker CLI (to communicate with host Docker daemon)
RUN apk add --no-cache docker-cli

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
