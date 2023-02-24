# syntax=docker/dockerfile:1

FROM node:latest
ENV NODE_ENV=production
ENV DEBUG=""
ENV SERVICE_HOST=""
ENV AMAZON_PAGE=""
ENV LANGUAGE=""
ENV DOCKER_HOST=""
ENV HOST=""


WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

CMD exec node main.js --debug=$DEBUG --alexaServiceHost=$SERVICE_HOST --amazonPage=$AMAZON_PAGE --acceptLanguage=$LANGUAGE --amazonPageProxyLanguage=$LANGUAGE --dockerHost=$DOCKER_HOST --host=$HOST
