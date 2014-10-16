function(doc,req) {
  //!code lib/traduxio.js
  if (!doc) return [null,{code:404,body:JSON.stringify({error:"Not found"})}];
  var result={};
  var user=Traduxio.getUser();
  result.user=user.name;
  result.anonymous=user.anonymous;
  if (req.method=="DELETE") {
    if (Traduxio.userQuit()) {
      result.ok="left correctly";
    } else {
      result.error=user.name+" was not registered";
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
    result.users={};
    for (var u in Traduxio.doc.users) {
      result.users[u]={name:doc.users[u].name,anonymous:doc.users[u].anonymous};
    }
  }
  if (result.ok)
    return [doc,JSON.stringify(result)];
  else
    return [null,JSON.stringify(result)];
}
