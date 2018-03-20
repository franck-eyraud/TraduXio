/*
  Requires dependencies installation
  See node_config.json for server settings (initially set up for localhost)
  Update _shows/copyright.js when server_url or private_key are changed
*/

var confirmationEmail=[
"Hello {{{fullname}}},",
"",
"Welcome to {{{site_name}}}.",
"",
"Your username is {{{username}}}",
"",
"Please confirm your email by clicking on this link {{{confirm_url}}}",
""
].join("\n");

var confirmationSubject="{{{site_name}}} email address confirmation";


var passwordResetSubject="{{{site_name}}} password reset"

var passwordResetEmail=[
"Hello {{{fullname}}},",
"",
"Your password is {{{password}}}",
"",
"Please CHANGE IT first thing when you access {{{site_name}}}.",
""
].join("\n");



var email = require('emailjs/email');
var Url  = require('url');
var nano=require('nano');
var crypto=require('crypto');
var mustache=require('mustache');
console.log(Url);

var config = JSON.parse(require("fs").readFileSync("node_config.json", "UTF-8"));
var MAX_CONFIRM_HOURS=config.max_hours || 24;

var email_server = email.server.connect({
   user: config.email_user,
   password: config.email_password,
   host: config.email_host
});

config.base_url=config.base_url || config.database+ "/_design/traduxio/_rewrite/works/";

var templateBase={
  site_name:config.site_name,
  base_url:config.base_url
};

function sendAdminEmail(message,subject,callback) {
  console.log("sending notification "+message+" to "+config.email_receiver);
  sendEmail({
    text: message,
    from: config.email_sender,
    to: config.email_receiver,
    subject: "Traduxio "+subject
  },function(err,message) {
    if (!err) {
      console.log("Notification message sent to " + config.email_receiver);
    } else {
      console.log("Error sending notification message to " + config.email_receiver+" "+err);
    }
    if (typeof callback =="function") callback(err,message);
  });
}


function sendConfirm(user,url,callback) {
  var template=templateBase;
  template.email_address=user.email;
  template.confirm_url=url;
  template.username=user.name;
  template.fullname=user.fullname?user.fullname : user.name;
  var toEmailAddress='"'+template.fullname+'" <'+user.email+'>';
  sendEmail({
    text: mustache.render(confirmationEmail,template),
    from: config.email_sender,
    to: toEmailAddress,
    subject: mustache.render(confirmationSubject,template)
  },function(err,message) {
    if (!err) {
      console.log("Sent confirmation email to " + toEmailAddress);
    } else {
      console.log("Error sending confirmation email to " + toEmailAddress+" "+err);
    }
    callback(err,message);
  });
}

function getConfirmKey(email,timestamp) {
  return crypto.createHash('sha1').update(config.salt).update(email.toLowerCase()).update(timestamp).digest("hex");
}

function isValidEmail(email) {
  var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegExp.test(email);
}

function isSameEmail(mail1,mail2) {
  mail1=typeof mail1=="string" ? mail1 : "";
  mail2=typeof mail2=="string" ? mail2 : "";
  return mail1.toLowerCase()==mail2.toLowerCase();
}

var known_users;

function recordUser(user,callback) {
  if (user._modified) {
    delete user._modified;
    console.log("insert modified user "+user.name);
    users_db.insert(user,function(err,body) {
      if (!err) {
        user._rev=body.rev;
      } else {
        console.log("error saving user "+user.name+" "+user._rev+" "+err);
        if (known_users[user.name]) console.log("known user is now "+known_users[user.name]._rev);
      }
      if (typeof callback === "function") callback(err);
    });
  } else {
    if (user._deleted) {
      if (known_users[user.name]) {
        console.log("user "+user.name+" is deleted");
        delete known_users[user.name];
        known_users._modified=true;
      }
    } else if (!user.name) {
      console.log("no name for user ????");
      console.log(user);
    } else if (!known_users[user.name] || !known_users[user.name]._rev || known_users[user.name]._rev!=user._rev) {
      console.log("updating entry of "+user.name);
      known_users[user.name]=user;
      known_users._modified=true;
    }
    if (typeof callback === "function") callback(true);
  }
}

function saveKnownUsers() {
  if (known_users._modified) {
    delete(known_users._modified);
    console.log("insert known users");
    admin_db.insert(known_users,function(err,body) {
      if (!err) {
        known_users._rev=body.rev;
      } else {
        known_users._modified=true;
        console.log("error saving known users "+err);
      }
    });
  }
}

function confirm(user,callback) {
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

  if (!user.name) {console.log("user doesn't have name");callback();return;}
  if (!user._deleted && user.email && isValidEmail(user.email)) {
    checkGroups(user);
    var toBeConfirmed=false,
      confirmed=false;
    //update user db in database (to allow user search)
    if (known_users[user.name] && !isSameEmail(known_users[user.name].email,user.email)) {
      toBeConfirmed=true;
      sendAdminEmail("user "+user.name+" changed email address from "+known_users[user.name].email+" to "+user.email,
        user.fullname+" ("+user.name+") changed email address");
      known_users[user.name]=user;
      known_users._modified=true;
    } else {
      var existing_timestamp;
      if (user.confirm_sent_timestamp) {
        existing_timestamp=user.confirm_sent_timestamp;
      }
      if (!known_users[user.name]) {
        sendAdminEmail("user "+user.name+" just registered with email address "+user.email+" and name "+user.fullname,
          user.fullname+" ("+user.name+") registered");
        known_users[user.name]=user;
        known_users._modified=true;
      } else {
        if (known_users[user.name].fullname!=user.fullname) {
          sendAdminEmail("user "+user.name+" changed name from "+known_users[user.name].fullname+" to "+user.fullname,
            known_users[user.name].fullname+" ("+user.name+") changed name");
        }
      }
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
              sendAdminEmail("user "+user.name+" just confirmed email address "+user.email,
                user.fullname+" ("+user.name+") confirmed email address");
                console.log("add role confirmed");
              user.roles.push("confirmed");
              delete user.confirm_error;
              user._modified=true;
            }
          } else {
            confirmed=true;
          }
        }
      } else {
        toBeConfirmed=true;
      }
    }

    var key=null;
    if (!confirmed) {
      unconfirm();
      if (toBeConfirmed) {
        if (user.confirm_error) {
          if (user.confirm_error_count && user.confirm_error_count>=3) {
            console.log("definitively abort sending email to "+user.email);
            return recordUser(user,callback);
          } else {
            delete user.confirm_error;
            user.confirm_error_count=user.confirm_error_count || 0;
            user.confirm_error_count++;
          }
        } else {
          if (user.confirm_error_count) {
            delete user.confirm_error_count;
            user._modified=true;
          }
        }
        var timestamp=new Date().toISOString();
        user.confirm_sent_timestamp=timestamp;
        user._modified=true;
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
        console.log("sent email to user "+user.name+", "+(user._modified ? "modified" : "not modified"));
        if (err) {
          console.log("recording email send error "+err);
          user.confirm_error="Error sending email : "+err.message;
          if (user.confirm_error_count && user.confirm_error_count>=3) {
            sendAdminEmail("error sending confirmation email to "+user.fullname+"("+user.name+")",
              "aborted sending email after "+user.confirm_error_count+" attempts, due to "+user.confirm_error);
          }
          delete user.confirm_sent_timestamp;
          user._modified=true;
        }
        recordUser(user,callback);
      });
      return;
    }
  }
  recordUser(user,callback);
}

function generatePassword(length) {
  var string="";
  while (string.length < length) {
    string+=Math.random().toString(36).slice(2);
  }
  return string.slice(0,length);
}

function sendEmail(message,callback) {
  if (config.send) {
    email_server.send(message,callback);
  } else {
    console.log("would send message to "+message.to+" from "+message.from+" with subject "+message.subject);
    callback();
  }
}

function sendPassword(user,callback) {
  var template=templateBase;
  template.email_address=user.email;
  template.password=user.password;
  template.fullname=user.fullname?user.fullname : user.name;
  var toEmailAddress='"'+template.fullname+'" <'+user.email+'>';
  sendEmail({
    text: mustache.render(passwordResetEmail,template),
    from: config.email_sender,
    to: toEmailAddress,
    subject: mustache.render(passwordResetSubject,template)
  },function(err,message) {
    if (!err) {
      console.log("Sent new password to " + toEmailAddress);
      if (!config.send) console.log(user.password);
    } else {
      console.log("Error sending new password to " + toEmailAddress+" "+err);
    }
    callback(err,message);
  });
}

var groups=null;

function checkGroups(user) {
  for (var groupname in groups) {
    checkGroup(user,groupname);
  }
}

function checkGroup(user,groupname) {
  function isLike(email) {
    return function(element) {
        return isSameEmail(element,email);
    }
  }

  if (!groups) return;

  var emails=groups[groupname];
  if (user.name && user.email && emails) {
    if (user.email && emails.filter(isLike(user.email)).length>0) {
      if (user.roles.indexOf(groupname)==-1) {
        user.roles.push(groupname);
        sendAdminEmail("user "+user.name+" was added to group "+groupname,
          user.fullname+" ("+user.name+") added to a group");
        console.log("Adding user "+user.name+" to group "+groupname);
        user._modified=true;
      } else {
        console.log("user "+user.name+" with email "+user.email+ " is part of group "+groupname);
      }
    } else {
      if (user.roles.indexOf(groupname)!=-1) {
        user.roles=user.roles.filter(function(g) {return g!=groupname;});
        sendAdminEmail("user "+user.name+" was removed from group "+groupname,
          user.fullname+" ("+user.name+") removed from a group");
        console.log("Removing user "+user.name+" from group "+groupname);
        user._modified=true;
      }
    }
  } else {
    if (!user.name) {
      console.log("trying to check group "+groupname+" on bad user");
      console.log(arguments);
    } else {
      console.log("no email for "+user.name);
    }
  }
}

function followGroups () {
  groups={};
  var group_follow=db.follow({
      include_docs:true,
      filter:function(doc,req) {
        return doc.type=="group";
      }
    });
  group_follow.on("change",function (change) {
    if (change.doc.group && change.doc.emails) {
      groups[change.doc.group]=change.doc.emails;
      console.log("receive group definition "+change.doc.group+" "+change.doc._id);
      for (var username in known_users) {
        var user=known_users[username];
        if (user.name) {
          checkGroup(user,change.doc.group);
          if (user._modified) {
            group_follow.pause();
            recordUser(user,function() {
              group_follow.resume();
            });
          }
        }
      }
    } else {
      console.log("received bad group definition");
      console.log(change.doc);
    }
  });
  group_follow.follow();
  return group_follow;
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
        if (isSameEmail(known_users[username].email,change.doc.email)) {
          console.log("found user "+username);
          var user=known_users[username];
          var password=generatePassword(12);
          user.password=password;
          user.forcedPassword=true;
          user._modified=true;
          recordUser(user,function(err) {
            if (err) {
              change.doc.error=err;
              db.insert(change.doc);
            } else {
              sendPassword(user,function(err,message) {
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
  return password_follow;
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
    user_follow.pause();
    confirm(change.doc,function() {
      user_follow.resume();
    });
  }).on("start",function() {
    console.log("Started");
  });
  user_follow.follow();
  return user_follow;
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

var users_db=admin_db.server.use("_users");
db.get("known_users",function(error,doc) {
  console.log(error);
  if (error && error.statusCode==404) {
    known_users={_id:"known_users"};
    admin_db.insert(known_users,function(err,body) {
      if (!err) {
        console.log("inserted known_users "+body.rev);
        known_users._rev=body.rev;
        followUsers().on("catchup",function() {
          console.log("catchup users");
          followGroups().on("catchup",function() {
            console.log("catchup groups");
            resetPasswords();
          });
        });
        setInterval(saveKnownUsers, 1000);
      } else {
        console.log(error);
        console.log("error not started");
      }
    });
  } else if (!error) {
    known_users=doc;
    followUsers().on("catchup",function() {
      console.log("catchup users");
      followGroups().on("catchup",function() {
        console.log("catchup groups");
        resetPasswords();
      });
    });
    setInterval(saveKnownUsers, 1000);
  } else {
    console.log(error);
    console.log("error not started");
  }
});

process.on('SIGINT', function() {
    process.exit();
});
