/*
  Requires dependencies installation
  See node_config.json for server settings (initially set up for localhost)
  Update _shows/copyright.js when server_url or private_key are changed
*/

var email = require('emailjs/email');
var Url  = require('url');
var nano=require('nano');
var crypto=require('crypto');
console.log(Url);

var config = JSON.parse(require("fs").readFileSync("node_config.json", "UTF-8"));
var MAX_CONFIRM_HOURS=config.max_hours || 24;

var email_server = email.server.connect({
   user: config.email_user,
   password: config.email_password,
   host: config.email_host
});

function sendConfirm(emailAddress,url,callback) {
  email_server.send({
    text: "Please confirm your email address by clicking on this link : "+url,
    from: config.email_sender,
    to: emailAddress,
    subject: "Traduxio confirmation d'adresse email"
  });
  console.log("Sent confirmation email to " + emailAddress);
}

function getConfirmKey(email,timestamp) {
  return crypto.createHash('sha1').update(config.salt).update(email).update(timestamp).digest("hex");
}

function isValidEmail(email) {
  var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegExp.test(email);
}

function confirm(user) {
  function unconfirm() {
    var confirmed_role=user.roles.indexOf("confirmed");
    if (confirmed_role != -1) {
      user.roles.splice(confirmed_role,1);
      console.log("remove confirmed role");
      user._modified=true;
    }
    if (user.confirm_key) {
      delete user.confirm_key;
      console.log("remove confirm key");
      user._modified=true;
    }
  }

  if (!user.name) {console.log("user doesn't have name");return;}
  if (user._deleted) {
    console.log("user is deleted");
    delete known_users[user.name]
    admin_db.insert(known_users);
    return;
  }
  if (user.email && isValidEmail(user.email)) {
    var expired=false,
      confirmed=false;
    //update user db in database (to allow user search)
    if (known_users[user.name] && known_users[user.name].email!=user.email) {
      expired=true;
    } else {
      var existing_timestamp=user.confirm_sent_timestamp;
      console.log("found existing_timestamp "+existing_timestamp);
      if (existing_timestamp) {
        var key=getConfirmKey(user.email,existing_timestamp);
        if (user.confirm_key && user.confirm_key==key) {
          confirmed=true;
          console.log("confirmed");
          if (user.roles.indexOf("confirmed") == -1) {
            console.log("add role confirmed");
            user.roles.push("confirmed");
            user._modified=true;
          } else {
            console.log("already role confirmed");
            console.log(user.roles);
          }
        } else {
          console.log("not confirmed");
          var spent_time=new Date().getTime()-new Date(existing_timestamp).getTime();
          expired=(spent_time > MAX_CONFIRM_HOURS * 3600 * 1000);
          if (expired) {console.log("expired "+spent_time)};
        }
      } else {
        expired=true;
      }
    }

    var key=null;
    if (!confirmed) {
      unconfirm();
      if (expired) {
        var timestamp=new Date().toISOString();
        user.confirm_sent_timestamp=timestamp;
        user._modified=true;
        console.log("getting key for "+user.email+" "+timestamp);
        key=getConfirmKey(user.email,timestamp);
      }
    }
    if (user._modified) {
      delete user._modified;
      known_users[user.name]=user;
      console.log("insert modified user");
      users_db.insert(user,function(err,body) {
        if (!err) {
          known_users[user.name]._rev=body.rev;
        } else {
          console.log("error saving user "+user.name+" "+user._rev);
        }
        console.log("insert known users");
        admin_db.insert(known_users);
      });
    } else {
      if (known_users[user.name] && (!known_users[user.name]._rev || known_users[user.name]._rev!=user._rev)) {
        console.log("insert known users");
        known_users[user.name]=user;
        admin_db.insert(known_users);
      }
    }
    if (key) {
      console.log("would send email to "+user.email+" with "+key);
    }
  } else {
    console.log("user "+user.name+" doesn't have email");
    return; // can't confirm
  }
}

function isEmail(doc, req) {
  return doc.email !== undefined;
}

function followUsers() {
  users_db=admin_db.server.use("_users");

  console.log("following users_db");

  var user_follow=users_db.follow({
      since: "0",
      include_docs:true
    });
  user_follow.on('change', function(change) {
    console.log("received change");
    confirm(change.doc);
  }).on("start",function() {
    console.log("Started");
  });
  user_follow.follow();

}

var admin_db, users_db;

try {
  var db=nano(config.database);
  var server=db.server;

  var db_url=new Url.URL(config.database);
  admin_url=new Url.URL(db_url);
  admin_url.username=config.admin_username;
  admin_url.password=config.admin_password;
  admin_url=Url.format(admin_url);
  admin_db=nano(admin_url);
} catch (e) {
  console.log (config.database+" is an invalid url: ");
  console.log(e);
  return;
}

var users_db=admin_db.server.use("/_users/");
db.get("known_users",function(error,doc) {
  console.log(error);
  if (error && error.statusCode==404) {
    known_users={_id:"known_users"};
    admin_db.insert(known_users,function(err,body) {
      if (!err) {
        console.log("inserted known_users "+body.rev);
        known_users._rev=body.rev;
        followUsers();
      } else {
        console.log(error);
        console.log("error not started");
      }
    });
  } else if (!error) {
    known_users=doc;
    followUsers();
  } else {
    console.log(error);
    console.log("error not started");
  }
});

process.on('SIGINT', function() {
    process.exit();
});
