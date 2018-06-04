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
            console.log("changed doc "+doc._id+" ("+doc._rev+")");
          }
          setTimeout(callback,2000,err);
        });
      } else {
        console.log("doc "+doc._id+" not modified");
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
    console.log("finished Processing");
    if (callback) callback();
  });
}

var tdxToCsv=function(doc,stack) {
  var text_parts=["keywords","abstract","bionote"];
  if (!doc) {
    var headers=[
      "id","rev","author","title","category","keywords","panel","language","status","translated title","translator","translator2","last_edit"
    ];
    text_parts.forEach(function(text_part) {
      headers.push(text_part);
      headers.push("translated "+text_part);
    });

    stack.push(headers);
    return false;
  }
  console.log("to csv for "+doc._id);
  var csv=[];
  csv.push(doc._id);
  csv.push(doc._rev);
  csv.push(doc.creator);
  csv.push(doc.title);
  var base=csv.concat();
  var translated=false;
  if (doc.translations) {
    for (var t in doc.translations) {
      var trans=doc.translations[t];
      if (trans.language && trans.text) {
        csv=base;
        csv.push(trans.language);
        csv.push(trans.status);
        csv.push(trans.title);
        csv.push(t);
        csv.push(trans.privileges && trans.privileges.owner || null);
        if (doc.edits) {
          var trans_edits=doc.edits.filter(function(e) {
            return e.version==t;
          })
          if (trans_edits.length) {
            var last_edit=trans_edits.pop().when;
          }
          csv.push(last_edit);
        }
        text_parts.forEach(function(text_part) {
          if (doc.metadata && doc.metadata.positions && doc.metadata.positions[text_part]) {
            if (doc.text) {
              csv.push(doc.text.slice(doc.metadata.positions[text_part].start,doc.metadata.positions[text_part].end+1).join(" "));
            } else {
              console.log(doc._id+" no text for "+text_part)
              csv.push("");
            }
            if (trans.text) {
              csv.push(trans.text.slice(doc.metadata.positions[text_part].start,doc.metadata.positions[text_part].end+1).join(" "));
            } else {
              console.log(doc._id+" no translation for "+text_part)
              csv.push("");
            }
          } else {
            if (text_part=="bionote" && doc.metadata && doc.metadata.positions && doc.metadata.positions["abstract"] && doc.text.length>doc.metadata.positions["abstract"].end+1) {
              csv.push(doc.text.slice(doc.metadata.positions["abstract"].end+2).join(" "));
              csv.push(trans.text.slice(doc.metadata.positions["abstract"].end+2).join(" "));
            } else {
              console.log(doc._id+" no positions for "+text_part)
              csv.push("");
              csv.push("");
            }
          }
        });

        stack.push(csv);
      }
    }
  }

  return false; //no modification
}

var fs=require("fs");
var nano=require('nano');


var config = JSON.parse(require("fs").readFileSync("config.json", "UTF-8"));

if (!config.server || !config.database) {
  console.log("config requires server, database");
  exit(1);
}

if (config.insecure_ssl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

if (config.user && config.password) {

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
    console.log("logged in, will start");
    start();
  });
} else {
  db=nano({url:config.server}).use(config.database);
  console.log("do not log in (no credentials provided), will start anonymously on "+config.server+"/"+config.database);
  start();
}

function start() {
  setTimeout(function() {
    //select one or other process function
    // {
    //   console.log("attrib");
    //   var attribution_file="data/doc_attribution.csv";
    //   var papa=require("./papaparse.min.js");
    //   var stream=fs.createReadStream(attribution_file);
    //   papa.parse(stream,{
    //     header:true,
    //     complete:function(parsed,stream){
    //         stream.close();
    //         console.log("read "+parsed.data.length+" rows for doc/owner");
    //         console.log(parsed);
    //         //console.log(parsed.data.map(function(a){return a.join(",");}).join("\n"));
    //         var attributions={};
    //         parsed.data.forEach(function(row,i) {
    //           if (row.doc && row.owner) {
    //             db.get(row.doc,function(err,doc) {
    //               if (err) {
    //                 console.log("error getting doc "+row.doc+" "+err);
    //               } else {
    //                 if (changePrivileges(doc,row.owner)) {
    //                   db.insert(doc,function() {
    //                     console.log("inserted "+doc._id);
    //                   });
    //                 }
    //               }
    //             });
    //             attributions[row.doc]=row.owner;
    //           }
    //         });
    //       }
    //     }
    //   );
    // }
    {
      function tdxIatis(doc) {
        var iatis_doc={};
        iatis_doc.id=doc._id;
        iatis_doc.rev=doc._rev;
        iatis_doc.author=doc.creator;
        iatis_doc.title=doc.title;
        iatis_doc.category=doc.metadata["Categories of Presentation"];
        if (iatis_doc.category=="Panels")  iatis_doc.panel=doc.metadata["Thematic Panels"];
        var trans_list=Object.keys(doc.translations);
        if (trans_list.length) {
          var trans=doc.translations[trans_list[0]];
          iatis_doc.translator=trans_list[0];
          iatis_doc.revisors=trans.privileges.sharedTo.filter(function(share) {
            return (share!="iatis" && share.indexOf("/*")==-1 && share!=trans.privileges.owner);
          }).join(",");
          iatis_doc.translation_status=trans.status;
          iatis_doc.translated_title=trans.title;
          iatis_doc.language=trans.language;
          var text_parts=["keywords","abstract","bionote"];
          text_parts.forEach(function(text_part) {
            if (doc.metadata && doc.metadata.positions && doc.metadata.positions[text_part]) {
              if (doc.text) {
                iatis_doc[text_part]=doc.text.slice(doc.metadata.positions[text_part].start,doc.metadata.positions[text_part].end+1).join(" ");
              } else {
                console.log(doc._id+" no text for "+text_part)
                iatis_doc[text_part]="";
              }
              if (trans.text) {
                iatis_doc["translated_"+text_part]=trans.text.slice(doc.metadata.positions[text_part].start,doc.metadata.positions[text_part].end+1).join(" ");
              } else {
                console.log(doc._id+" no translation for "+text_part)
                iatis_doc["translated_"+text_part]="";
              }
            } else if (text_part=="bionote") {
              iatis_doc[text_part]=doc.metadata["Biographical Note(s)"];
              if (doc.metadata && doc.metadata.positions && doc.metadata.positions["abstract"] && doc.text.length>doc.metadata.positions["abstract"].end+1) {
                iatis_doc["translated_"+text_part]=trans.text.slice(doc.metadata.positions["abstract"].end+2).join(" ");
              } else {
                iatis_doc["translated_"+text_part]="";
              }

            }
          });

        }
        return iatis_doc;
      }

      function compare(a1,a2) {
        if (!a1 || typeof a1 != "string") {
          return 1
        }
        if (!a2 || typeof a2 != "string") {
          return -1
        }
        return a1.localeCompare(a2);
      }

      var template_file="template.mustache";
      var docs=[];
      runProcess(function (doc) {
        var tdxDoc=tdxIatis(doc);
        if (tdxDoc.category!="Withdrawn")  docs.push(tdxDoc);
      },function() {
        docs.sort(function(a1,a2) {
          if (compare(a1.author,a2.author)==0) {
            return compare(a1.title,a2.title);
          } else {
            return compare(a1.author,a2.author);
          }
        });
        //console.log(docs);
        var grouped=require("group-array")(docs,"category");
        console.log(grouped);
        var grouped_panels=require("group-array")(grouped["Panels"],"panel");
        //console.log(grouped_panels);
        grouped["Panels"]={panels:require("group-array")(grouped["Panels"],"panel")};
        console.log(grouped);
        var source=require("fs").readFileSync(template_file);
        var hb=require("handlebars");
        var template=hb.compile(source.toString());
        require("fs").writeFileSync("data/output.html",template({category:grouped}));
      });
    }
    // {
    //   var filename="data/output_"+config.database+".csv";
    //   var csv=[];
    //   tdxToCsv(null,csv);
    //   runProcess(tdxToCsv,function() {
    //     groupArray(csv, 'Panel');
    //     console.log("finished");
    //     require("fs").writeFile(filename,
    //       require("array-to-csv")(csv,",",true),
    //       function() {
    //         console.log("file "+filename+" written");
    //         const { exec } = require('child_process');
    //         exec('ls -l '+filename,function(error,stdout,stderr) {
    //           console.log(error);
    //           console.log(stdout);
    //           console.log(stderr);
    //         });
    //
    //       });
    //   },csv);
    // }
    //runProcess(fixStatus);
  },3000);
}

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
            if (treating || !finished) {
              var wait=Math.random()*1000;
              setTimeout(treat,wait);
            } else {
              treating=true;
              console.log("\ntreating document "+(done+1)+"/"+body.rows.length+" "+row.id);
              treatment(row,function(err,res) {
                done++;
                if (!err) {
                  success++;
                  toBeTreated--;
                } else {
                  console.log("error treating "+row.id+" : "+err);
                  toBeTreated--;
                }
                treating=false;
                if (finished && toBeTreated==0) {
                  finish(total,success,skipped);
                }
              });
            }
          }
        } else {
          console.log("skipping document "+(done+1)+"/"+body.rows.length+" "+row.id);
          skipped++;
          done++;
        }
      });
      finished=true;
      if (finished && toBeTreated==0) {
        finish(total,success,skipped);
      }
    }
  });
}

function changePrivileges(doc,newOwner) {

  if (!doc) {
    console.log("no doc");
    return false;
  }
  var modified=false;

  function setOwner(doc) {
    if (!doc.privileges) {
      doc.privileges={};
      modified=true;
    }
    if (newOwner) {
      console.log(doc.privileges);
      if (!doc.privileges.owner) {
        if (newOwner) {
          doc.privileges.owner=newOwner;
          console.log("missing owner to doc "+doc.title+" - "+doc.creator+", set owner "+newOwner);
          modified=true;
        } else {
          console.log("no attribution to doc "+doc._id);
        }
      } else {
        if (newOwner) {
          if (doc.privileges.owner!=newOwner) {
            console.log("owner mismatch, changing from "+doc.privileges.owner+" to "+newOwner);
            doc.privileges.owner=newOwner;
            modified=true;
          }
        }
      }
    }
  }

  console.log(doc._id+" original");
  setOwner(doc);

  if (doc.translations) {
    for (var transID in doc.translations) {
      console.log(doc._id+" "+transID);
      var translation=doc.translations[transID];
      setOwner(translation);
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
