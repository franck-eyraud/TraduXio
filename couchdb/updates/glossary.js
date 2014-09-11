function (work, req) {
  if (!work) {
    return [null,{code:404,body:JSON.stringify({error:"not found"})}];
  }
  var args=JSON.parse(req.body);
  var glossaryEntry={};
  var num=-1;
  if (req.query.num) {
    if  (work.glossary[req.query.num]) {
      glossaryEntry=work.glossary[req.query.num];
      num=parseInt(req.query.num);
      for (var all in args) {
        glossaryEntry[all]=args[all];
      }
    } else {
      return [null,{code:404,body:JSON.stringify({error:"not found "+req.query.num})}];
    }
  } else {
    work.glossary=work.glossary || [];
    num=work.glossary.length;
    work.glossary.push(args);
  }
  return [work,JSON.stringify({ok:"glossary written",num:num})];
}
