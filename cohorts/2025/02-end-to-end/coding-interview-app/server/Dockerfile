FROM node:18-alpine

WORKDIR /app

# Install Docker and Podman CLI
RUN apk add --no-cache docker podman

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
