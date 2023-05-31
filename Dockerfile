FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

COPY tsconfig.json ./

COPY src ./src

RUN npm ci

ENV NODE_ENV=production

RUN npm run build

CMD ["node", "dist/bot.js"]
