var db;

var fixPrivileges=function() {
  var newOwner="traduxio";
  forAll(function(row,callback) {
    changePrivileges(row.id,newOwner,callback);
  },function() {
    console.log("finished");
  });
}

var process=function() {
  fixPrivileges();
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
  process();
});

function forAll(treatment,callback) {
  var maxTreat=50;
  function finish(total,success) {
    console.log("finished treating "+total+" doc, "+success+" succeeded");
    callback();
  }
  db.list({include_docs:true},function(err, body) {
    if (err) {
      console.log(err);
    } else if (body.rows) {
      var toBeTreated=0;
      var success=0;
      var total=0;
      var finished=false;
      var treating=false;
      body.rows.forEach(function(row) {
        if (total<maxTreat && row.id.indexOf("_design/") != 0 && row.doc && row.doc.text) {
          toBeTreated++;
          total++;
          treat();
          function treat() {
            if (treating) {
              var wait=Math.random()*1000;
              setTimeout(treat,wait);
            } else {
              treating=true;
              console.log("treating document "+row.id);
              treatment(row,function(err,res) {
                treating=false;
                if (!err) {
                  success++;
                  toBeTreated--;
                } else {
                  console.log("error treating "+row.id+" : "+err);
                  toBeTreated--;
                }
                if (finished && toBeTreated==0) {
                  finish(total,success);
                }
              });
            }
          }
        }
      });
      finished=true;
      if (finished && toBeTreated==0) {
        finish(total,success);
      }
    }
  });
}

function changePrivileges(docid,newOwner,callback) {
  callback=callback || function(){};
  db.get(docid,function(err,doc) {
    modified=false;
    if (!err) {
      if (!doc.privileges) {
        doc.privileges={};
        doc.privileges.owner=newOwner;
        if (doc.creativeCommons) {
          doc.privileges.public=true;
        }
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
            modified=true;
          }
        }
      }
      if (modified) db.insert(doc,function(err) {
        if (err) {
          console.log("error inserting doc "+err);
        } else {
          console.log("changed doc "+docid);
        }
        callback(err);
      });
      else {
        callback();
      }
    } else {
      console.log("error getting doc "+err);
      callback(err);
    }
  });
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


function splitText(text) {
  //captures all non punctuation characters, except if they are not folowed by a space,
  //or if they are preceded by a word of one letter or a list of abbrieviation words,
  //plus the tailing punctuation characters and their following spaces.
  //Also include new line as separation character
  //exceptions are looked after sentecne match because of javascript limitation
  //of look back feature
  var sentence=/([^\n\.\?\!]+?|[\!\?\.][^\s\!\?\.])+([\?\.\!\n]+\s*|$)/;
  var exceptions=/(\W|^)((\w|al|cf|ed|eds|eg|ie|no|pp|qtd|vol|vs|et|etc\.*|Mrs|Miss|Dr|Ph|Ph\.?D|Prof|No|Dept|Univ|Bros))\.\s*$/

  var sentences=[];
  var workingText=text;
  while (m=workingText.match(sentence)) {
    var s=m[0];
    console.log("extracted "+s);
    workingText=workingText.substring(m.index+m[0].length);
    console.log("new text "+workingText);
    while (s.match(exceptions) && (m=workingText.match(sentence))) {
      console.log("exception");
      s+=m[0];
      console.log("extracted "+s);
      workingText=workingText.substring(m.index+m[0].length);
      console.log("new text "+workingText);
    }
    sentences.push(s);
  }
  // console.log(text);
  // console.log(sentences);
  return sentences;
}
