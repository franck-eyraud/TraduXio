function(o, req) {
  if (!o || o.type!="password_request") {
    start({"code":404});
    return "Not Found";
  }
  var data={};
  if (o.success) {
    data.success=o.success;
  } else {
    data.pending=true;
  }
  return JSON.stringify(data);
}
