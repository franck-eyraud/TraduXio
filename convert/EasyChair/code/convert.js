

/* headers
[ '#',
  'title',
  'authors',
  'date',
  'time',
  'form fields',
  'keywords',
  'decision',
  'notified',
  'reviews sent',
  'abstract' ]
*/

process.on('SIGINT', function() {
    process.exit();
});


var db;

var importFile=function() {
  if (config.removeAll) {
    removeAll(readStep);
  } else {
    readStep(config.update);
  }
}

var fixPrivileges=function() {
  var newPrivileges={"owner":"iatis","sharedTo":["approved/*"]};
  forAll(function(row,callback) {
    changePrivileges(row.id,newPrivileges,callback);
  },function() {
    console.log("finished");
  });
}

var runProcess=function() {
  importFile();
}

var fs=require("fs");
var papa=require("./papaparse.min.js");
var nano=require('nano');


var config = JSON.parse(require("fs").readFileSync("config.json", "UTF-8"));

if (!config.server || !config.database || !config.user || !config.password) {
  console.log("config requires server, database, user and password");
}

if (config.insecure_ssl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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
  console.log("will process "+config.server+"/"+config.database);
  setTimeout(function() {
    runProcess();
  },config.wait_time || 20000);
});

function forAll(treatment,callback) {
  function finish(total,success) {
    console.log("finished treating "+total+" doc, "+success+" succeeded");
    callback();
  }
  db.list({include_docs:true},function(err, body) {
    if (body.rows) {
      var toBeTreated=0;
      var success=0;
      var total=0;
      var finished=false;
      body.rows.forEach(function(row) {
        if (row.id.indexOf("_design/") != 0 && row.doc && row.doc.text) {
          toBeTreated++;
          total++;
          console.log("treating document "+row.id);
          treatment(row,function(err,res) {
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
      });
      finished=true;
      if (finished && toBeTreated==0) {
        finish(total,success);
      }
    }
  });
}

function changePrivileges(docid,privileges,callback) {
  callback=callback || function(){};
  db.get(docid,function(err,doc) {
    if (!err) {
      doc.privileges=privileges;
      db.insert(doc,function(err) {
        if (err) {
          console.log("error inserting doc "+err);
        } else {
          console.log("changed doc "+docid);
        }
        callback(err);
      });
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
  console.log("Will remove all documents except design docs in 10 seconds");
  setTimeout(function() {
    forAll(remove,callback);
  },10000);
}


function readFull(checkExists) {
  var stream=fs.createReadStream("/data/submission.csv");
  papa.parse(stream,{
    header:true,
    complete:function(parsed,stream){
        stream.close();
        console.log("read "+parsed.data.length+" rows");
        console.log(parsed);
        //console.log(parsed.data.map(function(a){return a.join(",");}).join("\n"));
        parsed.data.forEach(function(row,i) {
          console.log(row);
          for (var i in row) {
            treatRow(row,callback,checkExists);
          }
        });
      }
    }
  );
}


var reverse_languages={
  "English":"en",
  "Putonghua":"zh",
  "Chinese":"zh"
};

var translation_languages=["en","zh"];

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
    //console.log("extracted "+s);
    workingText=workingText.substring(m.index+m[0].length);
    //console.log("new text "+workingText);
    while (s.match(exceptions) && (m=workingText.match(sentence))) {
      //console.log("exception");
      s+=m[0];
      //console.log("extracted "+s);
      workingText=workingText.substring(m.index+m[0].length);
      //console.log("new text "+workingText);
    }
    sentences.push(s);
  }
  // console.log(text);
  // console.log(sentences);
  return sentences;
}

var lock=false;

function store(work, callback) {
  if (!lock) {
    lock=true;
    console.log("taking lock");
    db.insert(work,function(err,body) {
      console.log("releasing lock");
      lock=false;
      callback(err,body);
    });
  } else {
    setTimeout(store,5,work,callback);
  }
}

var tostore=0,stored=0;

function treatRow(row,callback,checkExists) {

  var diff = require('deep-diff');

  var work={};
  work.id="EasyChairImport-"+row["#"];
  work.title=row.title;
  work.creator=row.authors;
  work.metadata=row;
  // for (var m in row) {
  //   work.metadata[m]=row[m];
  // }
  work.metadata.id=row["#"];
  work.metadata.keywords=row.keywords ? row.keywords.split("\n") : [];
  work.metadata.original_text=row.abstract;
  work.date=row["last updated"];
  work.language="en"; //default
  work.privileges={owner:config.user,"sharedTo":["approved/*"]};

  // Check if sentences are correctly split
  // work.text.forEach(function(line,i) {
  //   if (i>0 && line.length>0 && !line[0].match(/[A-Z]/)) {
  //     console.log("#"+row["#"]+" "+work.creator+" "+i+": "+work.text[i-1]+"\n"+line);
  //   }
  // })
  // return;

  function formFieldsExtract(form_fields) {
    //EasyChair form fields syntax :
    //^(form field label) form field value (can be multiline)
    var forms={};
    var lines=form_fields.match(/^.*$/gm);
    var curlabel,curvalue;
    lines.forEach(function(line) {
      var m=line.match(/^\((.*?)\) /);
      if (m) {
        if (curlabel) {
          forms[curlabel]=curvalue;
        }
        curlabel=m[1];
        curvalue=line.substring(m.index+m[0].length);
      } else {
        curvalue+="\n"+line;
      }
    });
    if (curlabel) {
      forms[curlabel]=curvalue;
    }
    return forms;
  }


  var form_fields=row["form fields"] ? formFieldsExtract(row["form fields"]) : {};
  for (var i in form_fields) {
    work.metadata[i]=form_fields[i];
  }
  if (work.metadata["Language of Presentation"]) {
    var language=work.metadata["Language of Presentation"];
    if (reverse_languages[language]) {
      work.language=reverse_languages[language];
    }
  }

  var accept=true;
  if (row.decision!='accept' || work.metadata["IATIS Policy"]!="Agree"
      || work.metadata["Thematic Panels"]=="Panel02") {
    accept=false;
  }

  work.text=[];
  work.metadata.positions={};

  work.text.push("======= Keywords =======");
  work.metadata.positions.keywords={start:work.text.length};;
  work.text.push(work.metadata.keywords.join(", "));
  work.metadata.positions.keywords.end=work.text.length-1;

  work.text.push("======= Abstract =======");
  work.metadata.positions.abstract={start:work.text.length};
  work.text=work.text.concat(row.abstract ? splitText(row.abstract) : []);
  work.metadata.positions.abstract.end=work.text.length-1;

  work.text.push("======= Biographical notes =======");
  work.metadata.positions.bionotes={start:work.text.length};
  work.text=work.text.concat(work.metadata["Biographical Note(s)"] ?
      splitText(work.metadata["Biographical Note(s)"]) : []);
  work.metadata.positions.bionotes.end=work.text.length-1;
  work.translations={};

  tostore++;
  if (checkExists) {
    db.view("traduxio","work-selection",{
      startkey:["#",""+work.metadata.id+""],
      endkey:["#",""+work.metadata.id+""],
      reduce:false,
      include_docs:true
    },function(err,body) {
      if (err) {
        console.log("error searching #"+work.metadata.id);
      } else {
        if (body.rows.length==0) {
          if (accept) {
            console.log("new #"+work.metadata.id);
            db.insert(work,function(err,body) {
              if (err) console.log(err);
              else {
                stored++;
                console.log("stored "+work.id+" as "+body.id);
                //console.log(body);
              }
              setTimeout(callback,100);
            });
          }
        } else if (body.rows.length==1) {
          var existing_doc=body.rows[0].doc;
          if (!accept) {
            console.log("#"+work.metadata.id+ " to be deleted");
            db.destroy(existing_doc._id,existing_doc._rev,function() {
              console.log("#"+work.metadata.id+ " deleted");
              callback();
            });
            return;
          }
          //console.log("found #"+work.metadata.id);
          var differences=diff.diff(work,existing_doc);
          if (differences) {
            differences=differences.filter(function (d) {
              if (["_id","_rev","edits","messages","privileges","translations","users","session","date"].indexOf(d.path[0])!=-1) return false;
              if (d.path[0]=="metadata" && ["original_text","authors","last updated","title","form fields"].indexOf(d.path[1])!=-1) return false;
              return true;
            });
          }
          if (differences && differences.length) {
            console.log("#"+work.metadata.id+" has changed");
            differences.forEach(function(d) {
              var p=d.path.join(".");
              if (d.path[0]=="text" || p=="metadata.abstract" || p=="metadata.form fields" ||p=="metadata.original_text" || p=="metadata.Biographical Note(s)") {
                var no_detail=true;
              }
              console.log("#"+work.metadata.id+" "+d.path.join(".")+" "+(!no_detail ? d.rhs+" => "+d.lhs : ""));
            });
            copy=JSON.parse(JSON.stringify(existing_doc));
            if (Object.keys(existing_doc.translations).length) {
              console.log("#"+work.metadata.id+" is translated "+Object.keys(existing_doc.translations).join(","));
              // for (var t in existing_doc.translations) {
              //   var trans=existing_doc.translations[t];
              //   if (trans.status && trans.status!="translating") {
              //     trans.status="translating";
              //   }
              // }
            }
            for (var m in work) {
              if (m!="translations" && m!="privileges") existing_doc[m]=work[m];
            }

            var newdiff=diff.diff(existing_doc,copy);
            if (newdiff) {
              console.log("#"+work.metadata.id+" applying "+newdiff.length+" differences");
              //console.log(newdiff);
            }
            db.insert(existing_doc,function(err,body) {
              if (err) console.log(err);
              else {
                stored++;
                console.log("stored "+work.id+" as "+body.id);
                //console.log(body);
              }
              setTimeout(callback,100);
            });

          } else if (existing_doc.translations.length) {
            console.log("#"+work.metadata.id+" is translated but has not changed "+Object.keys(existing_doc.translations).join(","));
          } else {
            return callback();
          }
        } else {
          console.log("found more than one #"+work.metadata.id);
          return callback();
        }
      }
    });
  } else {
    db.insert(work,function(err,body) {
      if (err) console.log(err);
      else {
        stored++;
        console.log("stored "+work.id+" as "+body.id);
        //console.log(body);
      }
      setTimeout(callback,100);
    });
  }
}

function readStep(checkExists) {
  var rows=0;
  var stream=fs.createReadStream("/data/submission.csv");
  console.log("step reading");
  var parser=papa.parse(stream,{
    header:true,
    step:function(parsed,p) {
      try {
        rows++;
        //console.log("read row #"+rows);
        var row=parsed.data[0];
        if (row) {
          var done=rows;
          //p.pause();
          treatRow(row,function() {
            //console.log("finished "+done);
          },checkExists);
          //p.resume();
        }
      } catch(e) {
        console.log(e);
      }
    },
    error:function(err) {
      console.log("error");
      console.log(err);
    },
    complete:function () {
      console.log("finished");
      console.log("stored "+stored+" out of "+tostore);
    }
  });
}
