FROM node:9.4.0

RUN mkdir /opt/traduxio/

WORKDIR /opt/traduxio/

RUN npm install --save emailjs@1.0.12 follow@1.0.0 mustache@2.3.0 nano@6.4.2

COPY node_server.js /opt/traduxio
COPY user_confirm.js /opt/traduxio

CMD node ./user_confirm.js

COPY node_config.json /opt/traduxio
