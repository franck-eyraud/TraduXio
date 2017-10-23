
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
            treatRow(row);
          }
        });
      }
    }
  );
}

var reverse_languages={
  "English":"en",
  "Chinese":"zh"
};

var translation_languages=["en","zh"];

function splitText(abstract) {
  //captures all non punctuation characters, except if they are not folowed by a space,
  //or if they are preceded by a word of one letter or a list of abbrieviation words,
  //plus the tailing punctuation characters and their following spaces.
  //Test RegExp : https://regexr.com/3h12o
  var sentence=/((?:\W(\w|cf|ie|eg|etc\.*|Mrs|Miss|Dr))\.(?=\s)|[^\.\?\!]+?|[\!\?\.][^\s\!\?\.])+([\?\.\!]+\s*|$)/g;
  return abstract.match(sentence)
}

readStep();

function treatRow(row) {
  console.log("treat Row "+row["#"]);
  var work={};
  work.id="EasyChairImport-"+row["#"];
  work.title=row.title;
  work.creator=row.authors;
  work.metadata={};
  work.metadata.id=row["#"];
  work.metadata.keywords=row.keywords.split("\n");
  work.metadata.original_text=row.abstract;
  work.text=splitText(row.abstract);
  work.date=row.date;
  work.language="en"; //default


  var form_fields=row["form fields"].split("\n");
  //EasyChair form fields are one per line with syntax :
  //(form field label) form field value
  var extract=/\(([^)]*)\) (.*)/;
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
  work.translations={};
  var new_trans={};
  var possible_languages=translation_languages.slice();
  if (possible_languages.indexOf(work.language)!=-1) {
    possible_languages.splice(possible_languages.indexOf(work.language),1);
  }
  new_trans.language=possible_languages.length ? possible_languages[0] : translation_languages[0];
  new_trans.text=new Array(work.text.length).fill("");
  work.translations["iatis"]=new_trans;
  console.log(work);
}

function readStep() {
  var rows=0;
  var stream=fs.createReadStream("/data/submission.csv");
  console.log("step reading");
  var parser=papa.parse(stream,{
    header:true,
    step:function(parsed,p) {
      try {
        parser=p;
        rows++;
        console.log("read row #"+rows);
        var row=parsed.data[0];
        if (row) {
          treatRow(row);
        }
      } catch(e) {
        console.log(e);
      }
    },
    error:function(err) {
      console.log(err);
    }
  });
}
