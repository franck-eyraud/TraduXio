/*
  Requires dependencies installation
  See node_config.json for server settings (initially set up for localhost)
  Update _shows/copyright.js when server_url or private_key are changed
*/

var email = require('emailjs/email');
var Url  = require('url');
var nano=require('nano');
console.log(Url);

var config = JSON.parse(require("fs").readFileSync("node_config.json", "UTF-8"));

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

function getDoc(id,database,callback) {
  database=new Url.URL(database || config.database);
  var url=new Url.URL(encodeURIComponent(id),database);
  var options=Url.format(url);
  options.method="GET";
  var data="";
  console.log(options);
  return http.request(options,function(response) {
    if (response.statusCode<200 || response.statusCode>=300) {
      err="error "+response.statusCode;
      callback(err,response.statusCode);
      return;
    }
    response.on('data',function(chunk) {
      data+=chunk;
    }).on('end',function () {
      console.log("got doc");
      console.log(data);
      try {
        var result=JSON.parse(data);
        callback(false,result);
      } catch(e) {
        callback(e.message,e);
      }
    });
  }).end();
}

function addDoc(doc,database,callback) {
  database=database || config.database;
  console.log("posting doc in "+database);
  var stringDoc = JSON.stringify(doc);
  var headers = {
  	'Content-Type': 'application/json',
  	'Content-Length': stringDoc.length
  };
  var options = Url.parse(database);
  options.method= 'POST';
  options.headers= headers;
  console.log(options);
  console.log(stringDoc);
  http.request(options,function(response) {
    console.log("response!");
    console.log(response.statusCode);
    response.on("end",function() {
      console.log("response end!");
      callback(response.statusCode);
    });
    response.on("error",function() {
      console.log("add doc error");
      console.log(arguments);
    })
  }).end(stringDoc);
}

function isValidEmail(email) {
  var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegExp.test(email);
}

function confirm(user) {
  function unconfirm(callback) {
    user.roles.splice(confirmed_role,1);
    users_db.insert(user,callback);
  }

  if (!user.name) {console.log("user doesn't have name");return;}
  var confirmed_role = user.roles.indexOf("confirmed") != -1;
  if (!user.email || !isValidEmail(user.email)) {
    if (confirmed_role) {
      unconfirm();
    }
    if (confirmed_users[user.name]) {
      delete confirmed_users[user.name]
      admin_db.insert(confirmed_users);
    }
    console.log("user "+user.name+" doesn't have email");
    return; // can't confirm
  }
  if (!confirmed_users[user.name] || confirmed_users[user.name]!=user.email) {
    //not confirmed
    if (confirmed_role) {
      unconfirm();
    }
    confirmDoc={
      type:"confirm",
      confirm_name:user.name,
      confirm_email:user.email
    }
    console.log("inserting confirm doc for "+user.name+" "+user.email);
    admin_db.insert(confirmDoc,function(err,body) {
      if (!err) {
        var link=config.database+"/"+body.id;
        console.log(body);
        console.log("will send sent confirmation to "+user.email+" to "+link);
        sendConfirm(user.email,function(err) {

        });
      } else {
        console.log(err);
      }
    });
  } else {
    console.log("user "+user.name+" already confirmed with email "+user.email);
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
db.get("confirmed_users",function(error,doc) {
  console.log(error);
  if (error && error.statusCode==404) {
    confirmed_users={_id:"confirmed_users"};
    admin_db.insert(confirmed_users,function(err,body) {
      if (!err) {
        confirmed_users._rev=body._rev;
      }
      followUsers();
    });
  } else if (!error) {
    confirmed_users=doc;
    followUsers();
  } else {
    console.log(error);
    console.log("error not started");
  }
});

process.on('SIGINT', function() {
    process.exit();
});
