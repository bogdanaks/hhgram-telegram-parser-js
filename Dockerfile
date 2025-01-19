FROM node:22.12-alpine AS base

RUN mkdir /app

WORKDIR /app

COPY . .

RUN npm install

CMD npm run start