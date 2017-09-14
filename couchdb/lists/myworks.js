function(head, req) {
  // !code lib/traduxio.js
  // !code lib/mustache.js

  function lastBefore(a,b) {
    return Traduxio.compareActivities(b,a);
  }

  start({headers: {"Content-Type": "text/html;charset=utf-8"}});
  var data = {mine:[],shared:[],public:[]};
  while (row = getRow()) {
    if (Traduxio.canAccess(row.value)) {
      if (Traduxio.isOwner(row.value)) {
        data.mine.push(row.value);
      } else if (Traduxio.isPublic(row.value)) {
        data.public.push(row.value);
      } else if (Traduxio.hasSharedAccess(row.value)) {
        data.shared.push(row.value);
      }
    }
  }
  data.shared.sort(lastBefore);
  data.mine.sort(lastBefore);
  data.public=data.public.sort(lastBefore);
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
