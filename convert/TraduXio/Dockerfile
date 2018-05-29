FROM node

RUN mkdir /convert

WORKDIR /convert

RUN curl -OL https://github.com/mholt/PapaParse/raw/master/papaparse.min.js

RUN npm install nano jonathanong/array-to-csv

RUN npm install handlebars group-array

COPY . /convert
