var defaultConfig = {
  chat:true
}

this.couchapp=this.couchapp || {};
this.couchapp.traduxio=this.couchapp.traduxio || defaultConfig;

var js_i18n_elements=js_i18n_elements || [];
js_i18n_elements.push("i_username");
js_i18n_elements.push("i_password");
js_i18n_elements.push("i_login");
js_i18n_elements.push("i_logout");
js_i18n_elements.push("i_search");

// !code lib/path.js
// !code lib/localization.js

Traduxio= {

  sessionLength:30 * 60 * 1000, //1/2 hour

  req:{},

  doc:{},

  compareActivities:function(a1,a2) {
    return new Date(a1.when).getTime()-new Date(a2.when).getTime();
  },

  unique_version_name:function(version) {
    var i=2;
    version=version.trim();
    var newname=version;
    while (this.doc.translations && newname in this.doc.translations || newname == "original" || newname.length == 0) {
      newname=version+" ("+i+")";
      i++;
    }
    return newname;
  },

  age:function(activity,r) {
    r=r||new Date();
    return r.getTime()-this.time(activity);
  },

  time:function(activity) {
    return new Date(activity.when).getTime();
  },

  canAccess:function(work) {
    log("canAccess ?"+work);
    if (work==null) {log ("can access absent work");return true;}
    work=work || this.doc;
    //var savDoc=this.doc; this.doc=work;
    var user=this.getUser();
    //this.doc=savDoc;
    var privileges=work.privileges || {public:true};
    log(privileges);
    if (user.isAdmin) return true;
    if (privileges.public) return true;

    log("not public");
    if (!user.anonymous) {
      if (privileges.owner==user.name) return true;
      try {
        if (privileges.readers && privileges.readers.indexOf(user.name)!=-1) return true;
      } catch (e) {
        log("caught exception in canAccess");
      }
    }
    log("no access");
    return false;
  },

  canEdit:function(work) {
    log("canEdit ?"+work);
    if (work==null) {log ("can edit absent work");return true;}
    work=work || this.doc;
    //var savDoc=this.doc; this.doc=work;
    var user=this.getUser();
    //this.doc=savDoc;
    var privileges=work.privileges || {public:true};
    if (!this.canAccess(work)) return false;
    if (user.isAdmin) return true;
    if (!user.anonymous) {
      if (!privileges.owner) return true;
      if (privileges.owner && privileges.owner==user.name) return true;
      try {
        if (privileges.editors && privileges.editors.indexOf(user.name)!=-1) return true;
      } catch (e) {
        log("caught exception e in canEdit");
      }
    } else {
      if (!privileges.owner && privileges.public)
        return true;
    }
    log("no edit");
    return false;
  },

  checkActiveUsers:function() {
    var toQuit=[];
    for (var user in this.doc.users) {
      var activeDate=new Date(this.doc.users[user].active);
      var expirationDate=new Date(activeDate.getTime()+this.sessionLength);
      if (expirationDate=="Invalid Date" || expirationDate < new Date()) {
        toQuit.push(user);
      }
    }
    toQuit.forEach(function(user){log(user+" leaves for inactivity");Traduxio.userQuit(user);});
  },

  userQuit:function(username) {
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
    this.doc.users=this.doc.users || {};

    var washere=false;
    var user;
    if (username) {
      user=this.doc.users[username];
      //conversion from old format
      if (!user.name) user.name=username;
      //TODO remove when data is conform
    } else {
      user=this.getUser();
      username=user.name;
      if (this.doc.users[username] && this.doc.users[username].active) {
        user.active=this.doc.users[username].active;
      } else {
        delete user.active;
      }
      log(user);
    }
    if (!user) return false;
    var alreadyActive=false;
    if(this.doc.users[username]) {
      alreadyActive=true;
    }
    this.doc.users[username]=user;
    log(this.doc.users);
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
      if (username==this.getUser().name) this.checkActiveUsers();
    }
    if (!alreadyActive) {
      this.doc.session=this.doc.session || [];
      this.addActivity(this.doc.session,{entered:true,author:username,anonymous:user.anonymous},false);
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

  isAdmin:function () {
    return this.getUser().isAdmin;
  },

  _isAdmin:function (userCtx,secObj) {
    if (!userCtx.name) return false;
    if (userCtx.roles.indexOf('_admin') != -1) return true;
    if (secObj.admins) {
      if (isArray(secObj.admins.names) && secObj.admins.names.indexOf(userCtx.name) != -1) return true;
      var ok=false;
      if (isArray(secObj.admins.roles) && isArray(userCtx.roles)) {
        userCtx.roles.forEach(function(role) {
          if (secObj.admins.roles.indexOf(role) != -1) {
            ok=true;
          };
        });
      }
      return ok;
    }
    return false;
  },

  getUser:function() {
    var user={};

    if (this.req.userCtx.name) {
      user.name=this.req.userCtx.name;
      user.roles=this.req.userCtx.roles;

      user.isAdmin=this._isAdmin(this.req.userCtx,this.req.secObj);

    } else {

      hashCode = function(string) {
        var hash = 0, i, chr;
        if (string.length === 0) return hash;
        for (i = 0; i < string.length; i++) {
          chr   = string.charCodeAt(i);
          hash  = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
        return hash.toString(16);
      };

      user.anonymous=true;
      user.name=null;

      if (this.req.peer && this.req.headers) {
        var footprint=this.req.peer+"|"+this.req.headers["User-Agent"]+"|"+this.req.headers.Host;
        user.anonymous=hashCode(footprint);
      }

    }
    return user;
  },

  addActivity: function(activityList,data,active) {
    if (typeof active == "undefined") active=true;
    var activity=data || {};
    activity.when = activity.when || new Date();
    activity.seq = this.req.info.update_seq;
    if (!activity.author) {
      var user=this.getUser();
      activity.author=user.name;
      if (user.anonymous) activity.anonymous=user.anonymous;
    }
    activityList.push(activity);
    if (active) this.userActivity();
    this.fixActivity(activityList);
    activityList.sort(this.compareActivities);
  },

  fixActivity: function(activityList) {
    for (var i in activityList) {
      var activity=activityList[i];
      activity.when=new Date(activity.when);
      activity.seq=activity.seq || this.req.info.update_seq;
      if (!activity.seq || activity.seq > this.req.info.update_seq) {
        activity.seq=this.req.info.update_seq-1;
      }
    }
  },

  getActivity: function(activityList,since,data,activity) {
    data=data || {};
    var activity=activity || [];
    for (var i=activityList.length-1;i>=0 && this.age(activityList[i],since)<=0;i--) {
      var a={};
      for (var t in activityList[i]) {
        a[t]=activityList[i][t];
      }
      for (var t in data) {
        a[t]=data[t];
      }
      activity.unshift(a);
    }
    return activity;
  }

};

if (typeof doc != "undefined" && doc!=null) Traduxio.doc=doc;
if (typeof req != "undefined" && req!=null) Traduxio.req=req;
