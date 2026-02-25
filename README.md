TraduXio – A participative platform for cultural texts translators
==================================================================

License: [GNU Affero General Public License](http://www.gnu.org/licenses/agpl.html)
Contact: aurelien.benel@utt.fr

Installation requirements
-------------------------

* Git client
* [CouchDB](http://couchdb.apache.org/)
* [Couchapp](https://github.com/jchris/couchapp)
* [Node.js](http://nodejs.org)

Installation procedure
----------------------

* Create a database named `traduxio` at <http://127.0.0.1:5984/_utils>.
* In any folder:

        git clone https://github.com/benel/TraduXio.git
        cd TraduXio
        couchapp push --browse couchdb http://127.0.0.1:5984/traduxio


Using docker compose
--------------------

You can run the application by using docker containers. The compose.yml file allows to run everything. What needs to be setup first is :

- Admin password necessary to manipulate users in `couchdb-admin.env`, `couchdh/.couchaprc` and `node/node_config.json`
- domain name for the installation, in `couchdb-custom.ini` and `node/node_config.json`
- email server to send notification emails in `node/node_config.json`

This procedure doesn't handle ssl configuration for https traffic, you need to either set it up separately, or use an exsting reverse proxy.

Tests requirements
------------------

* Ruby

Note: If you're on MacOS X, [change your `PATH`](http://stackoverflow.com/a/14138490/1121345) so that `gem` refers to brew's gem rather than to system's.

Tests installation procedure
---------------------------

* In any folder:

        sudo gem install capybara poltergeist rspec

Tests running
-------------

* In the application folder:

        rspec spec/features/* [--order random]
