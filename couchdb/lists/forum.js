function(head,req) {
  //!code lib/mustache.js
  start({headers: {"Content-Type": "text/html;charset=utf-8"}});

  data={subjects:[]};

  while (row=getRow()) {
    var subject=row.value.subject;
    if (subject != "chat")
      data.subjects.push({
        subject:subject,
        count:row.value.count,
        last_message:row.value.last_message,
        last_index:row.value.last_index,
        link:encodeURIComponent(subject)
      });
    data.work=row.value.work;
  }

  data.name="forum";
  data.css=true;
  data.script=true;
  data.prefix="../..";
  data.work_id=req.query.id;

  data.prefix_correction="";

  var path=req.path.join("/");
  if (req.headers["x-couchdb-requested-path"]) {
    path=req.headers["x-couchdb-requested-path"].split("?")[0];
  } else if (req.raw_path) {
    path=req.raw_path;
  }
  if (path.substr(path.length-1,1)=="/") {
    data.prefix_correction+="../";
  }
  if (req.query.hasOwnProperty("offset")) {
    data.prefix_correction+="../";
  }
  if (req.query.hasOwnProperty("descending")) {
    data.prefix_correction+="../";
  }

  data.prefix=data.prefix_correction+data.prefix;

  return Mustache.to_html(this.templates.forum, data, this.templates.partials);
}