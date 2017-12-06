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

config.base_url=config.base_url || config.database+ "/_design/traduxio/_rewrite/works/"

function sendConfirm(user,url,callback) {
  var name=user.fullname?user.fullname : user.name;
  var toEmailAddress='"'+name+'" <'+user.email+'>';
  email_server.send({
    text: "Please confirm your email address by clicking on this link : "+url+"\n\nYour username is : "+user.name+".",
    from: config.email_sender,
    to: toEmailAddress,
    subject: "Traduxio confirmation d'adresse email"
  },function(err,message) {
    if (!err) {
      console.log("Sent confirmation email to " + toEmailAddress+" "+message);
    } else {
      console.log("Error sending confirmation email to " + toEmailAddress+" "+err);
    }
    callback(err,message);
  });
}

function getConfirmKey(email,timestamp) {
  return crypto.createHash('sha1').update(config.salt).update(email).update(timestamp).digest("hex");
}

function isValidEmail(email) {
  var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegExp.test(email);
}

var known_users;

function recordUser(user,callback) {
  if (user._modified) {
    delete user._modified;
    console.log("insert modified user");
    users_db.insert(user,function(err,body) {
      if (!err) {
        user._rev=body.rev;
      } else {
        console.log("error saving user "+user.name+" "+user._rev+" "+err);
      }
      if (typeof callback === "function") callback(err);
    });
  } else {
    if (user._deleted) {
      if (known_users[user.name]) {
        console.log("user "+user.name+" is deleted");
        delete known_users[user.name]
        saveKnownUsers();
      }
    } else if (!known_users[user.name] || !known_users[user.name]._rev || known_users[user.name]._rev!=user._rev) {
      known_users[user.name]=user;
      saveKnownUsers();
    }
  }
}

var savingLock;
function saveKnownUsers() {
  if (!savingLock) {
    savingLock=true;
    console.log("insert known users");
    admin_db.insert(known_users,function(err,body) {
      if (!err) {
        known_users._rev=body.rev;
      } else {
        console.log("error saving known users "+err);
      }
      savingLock=false;
    });
  } else {
    console.log("already inserting known users");
    setTimeout(saveKnownUsers,100);
  }
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
      user.confirm_error="Bad confirm key, user the latest one";
      delete user.confirm_key;
      console.log("remove confirm key");
      user._modified=true;
    }
  }

  if (!user.name) {console.log("user doesn't have name");return;}
  if (!user._deleted && user.email && isValidEmail(user.email)) {
    var toBeConfirmed=false,
      confirmed=false;
    //update user db in database (to allow user search)
    if (known_users[user.name] && known_users[user.name].email!=user.email) {
      toBeConfirmed=true;
    } else {
      var existing_timestamp=user.confirm_sent_timestamp;
      console.log("found existing_timestamp "+existing_timestamp);
      if (existing_timestamp) {
        var key=getConfirmKey(user.email,existing_timestamp);
        if (user.confirm_key && user.confirm_key==key) {
          if (user.roles.indexOf("confirmed") == -1) {
            var spent_time=new Date().getTime()-new Date(existing_timestamp).getTime();
            var expired=(spent_time > MAX_CONFIRM_HOURS * 3600 * 1000);
            if (expired) {
              console.log("expired "+spent_time+" rejecting confirm_key");
              user.confirm_error="Confirmation token has expired";
              delete user.confirm_key;
              user._modified=true;
            } else {
              confirmed=true;
              console.log("confirmed");
              console.log("add role confirmed");
              user.roles.push("confirmed");
              delete user.confirm_error;
              user._modified=true;
            }
          } else {
            console.log("already role confirmed");
            confirmed=true;
          }
        } else {
          console.log("not confirmed");
        }
      } else {
        toBeConfirmed=true;
      }
    }

    var key=null;
    if (!confirmed) {
      unconfirm();
      if (toBeConfirmed) {
        var timestamp=new Date().toISOString();
        user.confirm_sent_timestamp=timestamp;
        delete user.confirm_error;
        user._modified=true;
        console.log("getting key for "+user.email+" "+timestamp);
        key=getConfirmKey(user.email,timestamp);
      }
    }
    if (key) {
      console.log("send email to "+user.email+" with "+key);
      //defer user save to after email sending
      let modified=user._modified;
      delete user._modified;
      sendConfirm(user,config.base_url+"?email_confirm="+key,function(err,message) {
        user._modified=modified;
        if (err) {
          console.log("recording email send error "+err);
          user.confirm_error="Error sending email : "+err.message;
          delete user.confirm_sent_timestamp;
          user._modified=true;
        }
        recordUser(user);
      });
    }
  }
  recordUser(user);
}

function isEmail(doc, req) {
  return doc.email !== undefined;
}

function generatePassword(length) {
  var string="";
  while (string.length < length) {
    string+=Math.random().toString(36).slice(2);
  }
  return string.slice(0,length);
}

function sendPassword(emailAddress,password,callback) {
  email_server.send({
    text: "Your password has been reset, please use "+password+" and CHANGE IT first thing",
    from: config.email_sender,
    to: emailAddress,
    subject: "Traduxio change password"
  },function(err,message) {
    if (!err) {
      console.log("Sent new password to " + emailAddress+" "+message);
    } else {
      console.log("Error sending new password to " + emailAddress+" "+err);
    }
    callback(err,message);
  });
}

function followGroups () {
  var group_follow=db.follow({
      include_docs:true,
      filter:function(doc,req) {
        return doc.type=="group";
      }
    });
  group_follow.on("change",function (change) {
    console.log("receive group definition");
    if (change.doc.group && change.doc.emails) {
      console.log("receive group definition "+change.doc.group);
      for (var username in known_users) {
        var user=known_users[username];
        if (user.email) {
          if (user.email && change.doc.emails.indexOf(user.email)!=-1) {
            console.log("found email "+user.email);
            if (user.roles.indexOf(change.doc.group)==-1) {
              user.roles.push(change.doc.group);
              console.log("Adding user "+user.name+" to group "+change.doc.group);
              user._modified=true;
            }
          } else {
            if (user.roles.indexOf(change.doc.group)!=-1) {
              user.roles=user.roles.filter(function(g) {return g!=change.doc.group;});
              console.log("Removing user "+user.name+" from group "+change.doc.group);
              user._modified=true;
            }
          }
          recordUser(user);
        }
      }
    }
  });
  group_follow.follow();
}

function resetPasswords() {
  var password_follow=db.follow({
      include_docs:true,
      filter:function(doc,req) {
        return doc.type=="password_request";
      }
    });
  password_follow.on("change",function (change) {
    if (change.doc.error || change.doc.success) { //ignore it, already users_db
      console.log("password request "+change.id+" already used");
      return;
    }
    if (change.doc.email) {
      console.log("received password reset request for "+change.doc.email);
      for (var username in known_users) {
        if (known_users[username].email==change.doc.email) {
          console.log("found user "+username);
          var user=known_users[username];
          var password=generatePassword(12);
          user.password=password;
          user._modified=true;
          recordUser(user,function(err) {
            if (err) {
              change.doc.error=err;
              db.insert(change.doc);
            } else {
              sendPassword(change.doc.email,user.password,function(err,message) {
                if (!err) {
                  change.doc.success="New password sent";
                } else {
                  console.log("found error "+err);
                  change.doc.error=err;
                }
                db.insert(change.doc);
              });
            }
          });
          return;
        }
      }
      console.log("email "+change.doc.email+" unknown");
      change.doc.success="searched";
      db.insert(change.doc);
    }
    console.log("no email found");
  });
  password_follow.follow();
}

function followUsers() {
  users_db=admin_db.server.use("_users");

  console.log("following users_db");

  var user_follow=users_db.follow({
      since: "0",
      include_docs:true
    });
  user_follow.on('change', function(change) {
    console.log("received change "+change.id);
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
        resetPasswords();
        followGroups();
      } else {
        console.log(error);
        console.log("error not started");
      }
    });
  } else if (!error) {
    known_users=doc;
    followUsers();
    resetPasswords();
    followGroups();
  } else {
    console.log(error);
    console.log("error not started");
  }
});

process.on('SIGINT', function() {
    process.exit();
});
