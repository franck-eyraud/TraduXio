function(doc,req) {

  if (doc) {
    return [null,{code:403,body:JSON.stringify({status:"forbidden"})}];
  }

  if (["PUT","POST"].indexOf(req.method)!=-1) {
    var args={};
    try {
      args = JSON.parse(req.body);
    } catch (e) {
      return [null,{code:400,body:"Couldn't parse JSON body"}];
    }
    if (!args.email) {
      return [null,{code:400,body:"Bad request"}];
    }
    doc={_id:req.uuid,type:"password_request",email:args.email};
  }

  return [doc,{code:201,body:JSON.stringify({status:"request accepted",id:doc._id})}];

}
