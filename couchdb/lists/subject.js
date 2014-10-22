function(head,req) {
  //!code lib/mustache.js
  start({headers: {"Content-Type": "text/html;charset=utf-8"}});

  data={messages:[]};
  data.subject=req.query.subject;

  if (data.subject=="new") delete data.subject;

  var i=0;
  while (row=getRow()) {
    var message=row.value.message;
    message.index=row.key[3];
    message.message=message.message.replace(/$/gm,"<br/>");
    message.when=new Date(message.when).toLocaleString();
    if (req.query.offset && i==0) {
      if (req.query.descending=="true") {
        data.next=req.query.subject+"/"+message.index;
      } else {
        data.prev=req.query.subject+"/"+message.index+"/back";
      }
    } else if (req.query.limit && i+parseInt(req.query.skip)==parseInt(req.query.limit)) {
      if (req.query.descending=="true") {
        data.prev=req.query.subject+"/"+message.index+"/back";
      } else {
        data.next=req.query.subject+"/"+message.index;
      }
    }
    if (req.query.descending=="true") data.messages.unshift(message);
    else data.messages.push(message);
    data.work=row.value.work;
    i++;
  }
  if (req.query.descending=="true" && i+parseInt(req.query.skip)<parseInt(req.query.limit)) {
    data.prev=req.query.subject;
  }

  var path;
  var path=req.path.join("/");
  if (req.headers["x-couchdb-requested-path"]) {
    path=req.headers["x-couchdb-requested-path"].split("?")[0];
  } else if (req.raw_path) {
    path=req.raw_path;
  }
  data.prefix="../../..";
  data.prefix_correction="";
  if (path.substr(path.length-1,1)=="/") {
    data.prefix_correction+="../";
  }
  if (req.query.hasOwnProperty("offset")) {
    data.prefix_correction+="../";
  }
  if (req.query.hasOwnProperty("descending")) {
    data.prefix_correction+="../";
  }
  if (data.prev) data.prev=data.prefix_correction+data.prev;
  if (data.next) data.next=data.prefix_correction+data.next;
  if (data.prefix) data.prefix=data.prefix_correction+data.prefix;

  data.name="subject";
  data.css=true;
  data.script=true;

  return Mustache.to_html(this.templates.subject, data, this.templates.partials);
}