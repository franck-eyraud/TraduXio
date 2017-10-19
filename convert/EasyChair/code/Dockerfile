FROM node

RUN mkdir /convert

WORKDIR /convert

RUN npm install babyparse

RUN curl -OL https://github.com/mholt/PapaParse/raw/master/papaparse.min.js

COPY . /convert
