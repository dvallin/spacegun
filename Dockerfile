FROM node:alpine as builder

WORKDIR /build

# Create the build environment (will not change often, will be cached in docker)
COPY package.json yarn.lock ./
RUN yarn install

COPY src src
COPY test test
COPY .babelrc jest.conf.js tsconfig.json webpack.config.js ./
RUN yarn test && yarn yarn audit && yarn build:server


FROM node:alpine

WORKDIR /srv

# Create the run environment (will not change often, will be cached in docker)
COPY package.json yarn.lock ./
ENV NODE_ENV production
RUN yarn install

COPY bin bin
COPY --from=builder /build/dist dist

ARG CONFIG_FOLDER
RUN test -n "$CONFIG_FOLDER"
COPY ${CONFIG_FOLDER} config

EXPOSE 8080
CMD [ "node", "./bin/spacegun-server", "-c", "./config/config.yml" ]
