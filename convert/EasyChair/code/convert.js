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
var stream=fs.createReadStream("data/submission.csv");
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
      		console.log(i+":"+row[i]);
      	}
      });
      readStep();
		}
	}
);

function readStep() {
var rows=0;
var stream=fs.createReadStream("data/submission.csv");
console.log("step reading");
papa.parse(stream,{
  header:true,
	step:function(parsed,stream) {
      rows++;
      console.log("read row #"+rows);
      var row=parsed.data[0];
      if (row) {
      	for (var i in row) {
      		console.log(i+":"+row[i]);
      	}
      }
		}
	}
);
}
