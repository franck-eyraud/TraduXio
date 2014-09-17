Traduxio= {

  sessionLength:30 * 60 * 1000, //1/2 hour
  
  doc:doc,
  req:req,

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
    for (var user in this.doc.users) {
      var activeDate=new Date(this.doc.users[user].active);
      var expirationDate=new Date(activeDate.getTime()+this.sessionLength);
      if (expirationDate < new Date()) {
        toQuit.push(user);
      }
    }
    toQuit.forEach(function(user){log(user+" leaves for inactivity");Traduxio.userQuit(user);});
  },

  userQuit:function(username) {
    username=username || this.getUserName();
    if (this.doc.users && this.doc.users[username]) {
      this.doc.session=this.doc.session || [];
      this.addActivity(this.doc.session,{left:true,author:username},false);
      delete this.doc.users[username];
      log("removing "+username+" from active users of "+this.doc._id);
      return true;
    }
    return false;
  },

  userActivity:function(username) {
    var washere=false;
    this.doc.users=this.doc.users || {};
    username=username || this.getUserName();
    var alreadyActive=this.doc.users[username] ? true : false;
    this.doc.users[username]=this.doc.users[username]||{};
    var update=false;
    if (this.doc.users[username].active) {
      var activeDate=new Date(this.doc.users[username].active);
      var expirationDate=new Date(activeDate.getTime()+this.sessionLength/2);
      if (expirationDate < new Date()) {
        update=true;
      }
    } else {
      update=true;
    }
    if (update) {
      this.doc.users[username].active=new Date();
      if (!alreadyActive) {
        this.doc.session=this.doc.session || [];
        this.addActivity(this.doc.session,{entered:true,author:username});
      }
      if (username==this.getUserName()) this.checkActiveUsers();
    }
    return update;
  },

  clearActivity:function (activityList,delay) {
    delay=delay || this.sessionLength;
    if (activityList && activityList.length) {
      this.doc.activity.sort(this.compareActivities);
      var now=new Date();
      for (var i=0;i<activityList.length && this.age(activityList[i],now)>delay;i++);
      log("splicing activity for "+i);
      activityList.splice(0,i);
    }
  },

  getUserName:function() {
    var user;
    if (req.userCtx.name) user=req.userCtx.name;
    else {
      var signature=req.peer+"|"+req.headers["User-Agent"]+"|"+req.headers.Host;
      this.doc.anonymous=this.doc.anonymous || {};
      if (!this.doc.anonymous[signature]) {
        var user="anonym-"+req.uuid.substr(-6,6);
        this.doc.anonymous[signature]=user;
      } else {
        var user=this.doc.anonymous[signature];
      }
    }
    return user;
  },

  addActivity: function(activityList,data,active) {
    if (typeof active == "undefined") active=true;
    var activity=data || {};
    activity.when = activity.when || new Date();
    activity.seq = req.info.update_seq;
    activity.author = activity.author || this.getUserName();
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
