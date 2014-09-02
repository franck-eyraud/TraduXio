function(doc,req) {
  //!code lib/traduxio.js

  var delay=req.query.delay || 60 * 10;
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

  if (doc.messages) for(var forum in doc.messages ) {
    Traduxio.getActivity(doc.messages[forum],since,{type:"forum",forum:forum},activity);
  }

  activity.sort(Traduxio.compareActivities);

  return JSON.stringify({since:since,now:now,activity:activity});

}
