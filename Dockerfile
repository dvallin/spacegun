FROM node:alpine

WORKDIR /usr/src/app
COPY package.json .
COPY bin bin
COPY dist dist

ENV NODE_ENV production
RUN npm install

ARG CONFIG_FOLDER
RUN test -n "$CONFIG_FOLDER"
COPY ${CONFIG_FOLDER} config

RUN echo ${CONFIG_FOLDER}
RUN ls ./config
RUN ls

EXPOSE 8080
CMD [ "node", "./bin/spacegun-server", "-c", "./config/config.yml" ]
