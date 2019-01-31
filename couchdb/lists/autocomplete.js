function (head, req) {
  // !code lib/traduxio.js

  var items=[];

  function match(search,term,ignoreCase) {
    if (search && search.length>0) {
      if (typeof term =="string") {
        if (ignoreCase) term=term.toLowerCase();
        if (term.indexOf(search) != -1) {
          return true;
        } else {
          Traduxio.debug && log(term+" ne contient pas "+search);
          return false;
        }
      }
    }
    return false;
  }

  var search=req.query.search;
  var ignoreCase=true;
  if (req.query.case_sensitive) {
    ignoreCase=false;
  }
  var returnAll=false;
  if (req.query.return_all) {
    returnAll=true;
  }
  if (search && ignoreCase) search=search.toLowerCase();

  if (search || returnAll) {
    while (row = getRow()) {
      var item={value:row.key,label:row.value};
      if (search && search.length>0) {
        if (match(search,row.key,ignoreCase) || match(search,row.value,ignoreCase)) {
          items.push(item);
        // } else {
        //   var detail;
        //   for (detail in row.value) {
        //     if (match(search,row.value[detail],ignoreCase)) {
        //       items.push(item);
        //       break;
        //     }
        //   }
        }
      } else if (returnAll) {
        items.push(item);
      } else {
        Traduxio.debug && log("do not select "+row.key);
      }
    }
  } else {
    Traduxio.debug && log("nothing to return");
  }

  Traduxio.debug && log(items);

  start ({headers: {"Content-Type": "application/json"}});
  return JSON.stringify(items);
}
