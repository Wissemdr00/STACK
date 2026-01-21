FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY apps/web/public ./public

EXPOSE 8080

CMD ["serve", "public", "-l", "8080", "-C"]
