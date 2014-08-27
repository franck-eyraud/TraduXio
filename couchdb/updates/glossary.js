function (work, req) {
  if (!work) {
    return [null,{code:404,body:JSON.stringify({error:"not found"})}];
  }
  var args=JSON.parse(req.body);
  var glossary_entry={};
  var num=-1;
  if (req.glossary_entry) {
    if  (work.glossary[req.glossary_entry]) {
      glossary_entry=work.glossary[req.glossary_entry];
      num=req.glossary_entry;
      for (var all in args) {
	glossary_entry[all]=args[all];
      }
    } else {
      return [null,{code:404,body:JSON.stringify({error:"not found "+req.glossary_entry})}];
    }
  } else {
    work.glossary=work.glossary || [];
    num=work.glossary.length;
    work.glossary.push(args);
  }
  return [work,JSON.stringify({ok:"glossary written",glossary_entry:num})];
}
