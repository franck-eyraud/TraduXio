function(doc,req) {
  //!code lib/traduxio.js
  var result={};
  var user=Traduxio.getUser();
  result.user=user.name;
  result.anonymous=user.anonymous;
  if (req.method=="DELETE") {
    if (Traduxio.userQuit()) {
      result.ok="left correctly";
    } else {
      result.error="was not registered";
    }
  } else {
    var msg="pinged correctly";
    if (!doc.users || !doc.users[user.name]) {
      msg="registered correctly";
    }
    if (Traduxio.userActivity()) {
      result.ok=msg;
    } else {
      result.error="too early";
    }
    result.sessionLength=Traduxio.sessionLength*0.95;
    result.users=doc.users;
  }
  if (result.ok)
    return [doc,JSON.stringify(result)];
  else
    return [null,JSON.stringify(result)];
}
