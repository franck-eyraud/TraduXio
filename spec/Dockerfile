FROM instructure/ruby:2.3

USER root

RUN apt-get install g++ python-dev &&  curl -O https://bootstrap.pypa.io/get-pip.py && python ./get-pip.py && pip install --user couchapp
RUN gem install poltergeist rspec

USER docker

COPY samples samples
COPY *.sh ./
COPY *.rb ./
COPY features features
