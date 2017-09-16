function(head, req) {
  // !code lib/traduxio.js
  // !code lib/mustache.js

  function lastBefore(a,b) {
    return Traduxio.compareActivities(b,a);
  }

  start({headers: {"Content-Type": "text/html;charset=utf-8"}});
  var data = {works:[]};
  var currentWork=null;
  while (row = getRow()) {
    if (Traduxio.canAccess(row.value)) {
      if (!currentWork || currentWork.id != row.key[1]) {
        if (currentWork && (Traduxio.isOwner(currentWork) || currentWork.translations.length)) {
          currentWork.translations.reverse();
          data.works.push(currentWork);
        }
        currentWork=row.value;
        currentWork.translations=[];
      } else {
        if (Traduxio.isOwner(row.value) || Traduxio.hasSharedAccess(row.value)) {
          currentWork.translations.push(row.value);
        }
      }
    }
  }
  if (currentWork && (Traduxio.isOwner(currentWork) || currentWork.translations.length)) {
    currentWork.translations.reverse();
    data.works.push(currentWork);
  }
  data.works.reverse();
  data.name="myworks";
  data.scripts=["ul-close"];
  data.script=true;
  data.css=true;
  data.prefix="..";
  data.i18n=localized();
  data.page_title=data.i18n["i_works_list"];
  return Mustache.to_html(this.templates.myworks, data,this.templates.partials);
  return toJSON(data);
}
