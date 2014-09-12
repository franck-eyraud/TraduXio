Traduxio= {

  sessionLength:30 * 60 * 1000, //1/2 hour

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

  checkActiveUsers:function() {
    var toQuit=[];
    for (var user in doc.users) {
      var activeDate=new Date(doc.users[user].active);
      var expirationDate=new Date(activeDate.getTime()+this.sessionLength);
      if (expirationDate < new Date()) {
        toQuit.push(user);
      }
    }
    toQuit.forEach(function(user){log(user+" leaves for inactivity");Traduxio.userQuit(user);});
  },

  userQuit:function(username) {
    username=username || this.getUserName();
    if (doc.users && doc.users[username]) {
      doc.session=doc.session || [];
      this.addActivity(doc.session,{left:true,author:username},false);
      delete doc.users[username];
      log("removing "+username+" from active users of "+doc._id);
      return true;
    }
    return false;
  },

  userActivity:function(username) {
    var washere=false;
    doc.users=doc.users || {};
    username=username || this.getUserName();
    var alreadyActive=doc.users[username] ? true : false;
    doc.users[username]=doc.users[username]||{};
    var update=false;
    if (doc.users[username].active) {
      var activeDate=new Date(doc.users[username].active);
      var expirationDate=new Date(activeDate.getTime()+this.sessionLength/2);
      if (expirationDate < new Date()) {
        update=true;
      }
    } else {
      update=true;
    }
    if (update) {
      doc.users[username].active=new Date();
      if (!alreadyActive) {
        doc.session=doc.session || [];
        this.addActivity(doc.session,{entered:true,author:username});
      }
      if (username==this.getUserName()) this.checkActiveUsers();
    }
    return update;
  },

  clearActivity:function (doc,delay) {
    delay=delay || this.sessionLength;
    if (doc.hasOwnProperty("activity")) {
      doc.activity.sort(this.compareActivities);
      log(doc.activity);
      var now=new Date();
      for (var i=0;i<doc.activity.length && this.age(doc.activity[i],now)>delay;i++);
      log("splicing activity for "+i);
      log(doc.activity.splice(0,i));
    }
  },

  getUserName:function() {
    var user;
    if (req.userCtx.name) user=req.userCtx.name;
    else {
      var signature=req.peer+"|"+req.headers["User-Agent"]+"|"+req.headers.Host;
      doc.anonymous=doc.anonymous || {};
      if (!doc.anonymous[signature]) {
        var user="anonym-"+req.uuid.substr(-6,6);
        doc.anonymous[signature]=user;
      } else {
        var user=doc.anonymous[signature];
      }
    }
    return user;
  },

  addActivity: function(activityList,data,active) {
    if (typeof active == "undefined") active=true;
    var activity=data || {};
    activity.when = activity.when || new Date();
    activity.seq = req.info.update_seq;
    activity.author = activity.author || this.getUserName(doc);
    activityList.push(activity);
    if (active) this.userActivity();
    this.fixActivity(activityList);
    activityList.sort(this.compareActivities);
  },

  fixActivity: function(activityList) {
    for (var i in activityList) {
      activityList[i].when=new Date(activityList[i].when);
      activityList[i].seq=activityList[i].seq || req.info.update_seq;
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
