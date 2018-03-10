process.on('SIGINT', function() {
    process.exit();
});

var db;

var fixStatus=function(doc) {
  var modified;
  if (doc.translations) {
    for (var t in doc.translations) {
      var trans=doc.translations[t];
      if (trans.status) {
        console.log(doc._id+" is "+trans.status);
        if (trans.status=="validating") {
          trans.status="proofreading";
          modified=true;
        }
        if (trans.status=="validated") {
          trans.status="proofread";
          modified=true;
        }
      }
    }
  }
  return modified;
}

var runProcess=function(processFunction,callback) {
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  args.shift();
  forAll(function(row,callback) {
    function run(doc) {
      args.unshift(doc);
      if (processFunction.apply(this,args)) {
        console.log("doc "+doc._id+" is modified, post");
        db.insert(doc,function(err) {
          if (err) {
            console.log("error inserting doc "+err);
          } else {
            console.log("changed doc "+doc._id);
          }
          callback(err);
        });
      } else {
        callback();
      }
      args.shift();
    }
    if (!row.doc) {
      db.get(row.id,function(err,doc) {
        if (err) {
          console.log("error getting doc "+err);
          return callback(err);
        } else {
          run(doc);
        }
      });
    } else {
      run(row.doc);
    }
  },function() {
    console.log("finished fixingPrivileges");
    if (callback) callback();
  });
}

var tdxToCsv=function(doc,stack) {
  if (!doc) {
    var headers=[
      "id","author","title","language","text","translation"
    ];
    stack.push(headers);
    return false;
  }
  console.log("to csv for "+doc._id);
  var csv=[];
  csv.push(doc._id);
  csv.push(doc.creator);
  csv.push(doc.title);
  csv.push(doc.language);
  csv.push(doc.metadata["original_text"]);
  csv.push(doc.privileges && doc.privileges.owner || null);
  var translated=false;
  if (doc.translations) {
    for (var t in doc.translations) {
      var trans=doc.translations[t];
      if (trans.language=="zh") {
        translated=trans.text.join("\n\n");
      }
    }
    if (translated) {
      csv.push(translated);

      stack.push(csv);
    }
  }
  return false; //no modification
}

var fs=require("fs");
var nano=require('nano');


var config = JSON.parse(require("fs").readFileSync("config.json", "UTF-8"));

if (!config.server || !config.database || !config.user || !config.password) {
  console.log("config requires server, database, user and password");
}


var cookies={};

console.log("Logging in on "+config.server+" as "+config.user);

nano(config.server).auth(config.user,config.password,function (err, body, headers) {
  if (err) {
    console.log("error logging in");
    console.log(err);
    return;
  }

  if (headers && headers['set-cookie']) {
    cookies = headers['set-cookie'];
    console.log(cookies);
  }

  db=nano({url:config.server,
    cookie:headers['set-cookie']
  }).use(config.database);
  var csv=[];
  tdxToCsv(null,csv);
  runProcess(tdxToCsv,function() {
    console.log("finished");
    console.log(require("array-to-csv")(csv,",",true));
  },csv);
  //runProcess(fixStatus);
  //runProcess(changePrivileges);
});

function forAll(treatment,callback) {
  var maxTreat=0;
  function finish(total,success,skipped) {
    console.log("finished treating "+total+" doc, "+success+" succeeded, "+skipped+" skipped");
    callback();
  }
  console.log("listing");
  db.list({include_docs:true},function(err, body) {
    if (err) {
      console.log(err);
    } else if (body.rows) {
      console.log("listed "+body.rows.length);
      var toBeTreated=0;
      var success=0;
      var done=0;
      var total=0;
      var skipped=0;
      var finished=false;
      var treating=false;
      body.rows.forEach(function(row) {
        if ((!maxTreat || total<maxTreat) && row.id.indexOf("_design/") != 0 && row.doc && row.doc.title && row.doc.translations) {
          toBeTreated++;
          total++;
          treat();
          function treat() {
            if (treating) {
              var wait=Math.random()*1000;
              setTimeout(treat,wait);
            } else {
              treating=true;
              console.log("treating document "+(done+1)+"/"+body.rows.length+" "+row.id);
              treatment(row,function(err,res) {
                treating=false;
                done++;
                if (!err) {
                  success++;
                  toBeTreated--;
                } else {
                  console.log("error treating "+row.id+" : "+err);
                  toBeTreated--;
                }
                if (finished && toBeTreated==0) {
                  finish(total,success,skipped);
                }
              });
            }
          }
        } else {
          skipped++;
        }
      });
      finished=true;
      if (finished && toBeTreated==0) {
        finish(total,success,skipped);
      }
    }
  });
}

function changePrivileges(doc) {
  var newOwner="newowner";
  var modified=false;
  if (!doc.privileges) {
    doc.privileges={};
    doc.privileges.owner=newOwner;
    if (doc.creativeCommons) {
      doc.privileges.public=true;
    }
    console.log("missing privilges to full doc, set owner "+newOwner);
    modified=true;
  }
  if (doc.translations) {
    for (var transID in doc.translations) {
      var translation=doc.translations[transID];
      if (!translation.privileges) {
        translation.privileges={};
        translation.privileges.owner=newOwner;
        if (translation.creativeCommons) {
          translation.privileges.public=true;
        }
        console.log("missing privileges to translation "+transID+", set owner "+newOwner);
        modified=true;
      }
    }
  }
  return modified;
}

function remove(row,callback) {
  db.destroy(row.id,row.value.rev,callback);
}


function removeAll(callback) {
  console.log("Will remove all documents except design docs in 1 seconds");
  setTimeout(function() {
    forAll(remove,callback);
  },1000);
}
