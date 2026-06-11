FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["npm", "start"]
