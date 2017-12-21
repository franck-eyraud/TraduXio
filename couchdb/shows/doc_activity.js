function(doc,req) {
  //!code lib/traduxio.js

  if (!Traduxio.canAccess(doc)) {
    throw({forbidden:"no access to this doc"});
  }

  var delay=req.query.delay || 60 * 10;
  var max=req.query.max;
  var now=new Date();
  if (req.query.since) {
    if (req.query.since.indexOf("@")==0) {
      log(parseInt(req.query.since.substr(1)));
      var since=new Date(parseInt(req.query.since.substr(1)));
    } else if (isNaN(Date.parse(req.query.since))){
      return {code:400,body:"bad date string"};
    } else {
      var since=new Date(req.query.since);
    }
  } else if (delay) {
    var since=new Date(new Date().getTime()-delay*1000);
  }
  var activity=[];

  if(doc.edits) Traduxio.getActivity(doc.edits,since,{type:"edit"},activity);
  if(doc.glossary && doc.glossary.edits) Traduxio.getActivity(doc.glossary.edits,since,{type:"glossary"},activity);
  if(doc.session) Traduxio.getActivity(doc.session,since,{type:"session"},activity);
  if (doc.messages) for(var forum in doc.messages ) {
    Traduxio.getActivity(doc.messages[forum],since,{type:"forum",forum:forum},activity);
  }

  activity=activity.filter(Traduxio.canAccessActivity);
  activity.sort(Traduxio.compareActivities);
  if (activity.length>max) {
    activity=activity.splice(activity.length-max,max);
  }

  return JSON.stringify({since:since,now:now,activity:activity});

}
