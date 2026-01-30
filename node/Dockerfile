FROM node

RUN mkdir /opt/traduxio/

WORKDIR /opt/traduxio/

RUN npm install --save emailjs follow recaptcha nano mustache

COPY node_server.js /opt/traduxio
COPY user_confirm.js /opt/traduxio

CMD node ./user_confirm.js

COPY node_config.json /opt/traduxio
