Traduxio= {

  compareActivities:function(a1,a2) {
    return new Date(a1.when).getTime()-new Date(a2.when).getTime();
  },

  age:function(activity,r) {
    r=r||new Date();
    return r.getTime()-this.time(activity);
  },

  time:function(activity) {
    return new Date(activity.when).getTime();
  },

  clearActivity:function (doc,delay) {
    delay=delay || 24 * 60 * 60;
    if (doc.hasOwnProperty("activity")) {
      doc.activity.sort(this.compareActivities);
      log(doc.activity);
      var now=new Date();
      for (var i=0;i<doc.activity.length && this.age(doc.activity[i],now)>delay;i++);
      log("splicing activity for "+i);
      log(doc.activity.splice(0,i));
    }
  },

  addActivity: function(activityList,data) {
    var activity=data || {};
    activity.when = activity.when || new Date();
    activity.author = activity.author || req.userCtx.name || "anonymous";
    activityList.push(activity);
    this.fixActivity(activityList);
    activityList.sort(this.compareActivities);
  },

  fixActivity: function(activityList) {
    for (var i in activityList) {
      activityList[i].when=new Date(activityList[i].when);
    }
  },

  getActivity: function(activityList,since,data,activity) {
    data=data || {};
    var activity=activity || [];
    for (var i=activityList.length-1;i>=0 && this.age(activityList[i],since)<=0;i--) {
      for (var t in data) {
        activityList[i][t]=data[t];
      }
      activity.unshift(activityList[i]);
    }
    return activity;
  }

};
