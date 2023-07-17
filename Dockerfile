FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY src ./src
COPY frontend ./frontend
COPY prisma ./prisma

RUN npm ci

ENV NODE_ENV=production
ENV DATABASE_URL="file:./clooney.db"

RUN npx prisma migrate deploy
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
