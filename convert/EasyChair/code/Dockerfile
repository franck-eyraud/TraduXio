FROM node

RUN mkdir /convert

WORKDIR /convert

RUN curl -OL https://github.com/mholt/PapaParse/raw/master/papaparse.min.js

RUN npm install nano

COPY . /convert
