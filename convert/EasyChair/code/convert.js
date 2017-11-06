

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

var fs=require("fs");
var papa=require("./papaparse.min.js");
var nano=require('nano');


var config = JSON.parse(require("fs").readFileSync("config.json", "UTF-8"));

if (!config.server || !config.database || !config.user || !config.password) {
  console.log("config requires server, database, user and password");
}

var db;


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
  readStep();
});

function readFull() {
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
            treatRow(row,callback);
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

function splitText(abstract) {
  //captures all non punctuation characters, except if they are not folowed by a space,
  //or if they are preceded by a word of one letter or a list of abbrieviation words,
  //plus the tailing punctuation characters and their following spaces.
  //Test RegExp : https://regexr.com/3h12o
  var sentence=/((?:\W(\w|al|cf|eds|eg|ie|no|pp|qtd|vol|vs|etc\.*|Mrs|Miss|Dr))\.(?=\s)|[^\.\?\!]+?|[\!\?\.][^\s\!\?\.])+([\?\.\!]+\s*|$)/g;
  return abstract.match(sentence);
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

function treatRow(row,callback) {
  //console.log("treat Row "+row["#"]);
  var work={};
  work.id="EasyChairImport-"+row["#"];
  work.title=row.title;
  work.creator=row.authors;
  work.metadata=row;
  work.metadata.id=row["#"];
  work.metadata.keywords=row.keywords ? row.keywords.split("\n") : [];
  work.metadata.original_text=row.abstract;
  work.date=row.date;
  work.language="en"; //default
  work.privileges={owner:config.user};

  // Check if sentences are correctly split
  // work.text.forEach(function(line,i) {
  //   if (i>0 && line.length>0 && !line[0].match(/[A-Z]/)) {
  //     console.log("#"+row["#"]+" "+work.creator+" "+i+": "+work.text[i-1]+"\n"+line);
  //   }
  // })
  // return;


  var form_fields=row["form fields"] ? row["form fields"].match(/\((.*?)\) (.*)/g) : [];
  //EasyChair form fields are one per line with syntax :
  //(form field label) form field value
  var extract=/\((.*?)\) (.*)/;
  form_fields.forEach(function (form_field_entry) {
    var match=form_field_entry.match(extract);
    if (match && match.length>=3) {
      var form_field_label=match[1];
      var form_field_value=match[2];
      work.metadata[form_field_label]=form_field_value;
    }
  });
  if (work.metadata["Language of Presentation"]) {
    var language=work.metadata["Language of Presentation"];
    if (reverse_languages[language]) {
      work.language=reverse_languages[language];
    }
  }
  work.text=[];
  work.text.push("Keywords : "+work.metadata.keywords.join(", "));
  work.text.push("Biographical notes");
  work.text=work.text.concat(work.metadata["Biographical Note(s)"] ?
      splitText(work.metadata["Biographical Note(s)"]) : []);
  work.text.push("Abstract");
  work.text=work.text.concat(row.abstract ? splitText(row.abstract) : []);
  // if (work.metadata["Language of Presentation"]!="English") {
  //   console.log("#"+row["#"]+" does not use English : "+work.metadata["Language of Presentation"]);
  // }
  // if (work.metadata["IATIS Policy"]!="Agree") {
  //   console.log("#"+row["#"]+" did not accept IATIS Policy "+work.metadata["IATIS Policy"]);
  // }
  if (row.decision!='accept' || work.metadata["IATIS Policy"]!="Agree") {
    //console.log("not accepted, skip");
    return callback();
  }
  console.log("#"+row['#']+" accepted, store");
  work.translations={};
  var new_trans={};
  var possible_languages=translation_languages.slice();
  if (possible_languages.indexOf(work.language)!=-1) {
    possible_languages.splice(possible_languages.indexOf(work.language),1);
  }
  new_trans.language=possible_languages.length ? possible_languages[0] : translation_languages[0];
  new_trans.text=new Array(work.text.length).fill("");
  new_trans.privileges={owner:config.user};
  work.translations["iatis"]=new_trans;
  //console.log(work);
  //return callback();
  tostore++;
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

function readStep() {
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
          });
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
