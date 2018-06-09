FROM node:8.10


ENV NODE_PATH=/node_modules
ENV PATH=$PATH:/node_modules/.bin

RUN yarn global add serverless

WORKDIR /app
ADD . /app
