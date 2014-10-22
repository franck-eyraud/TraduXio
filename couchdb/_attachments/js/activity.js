
(function($,Traduxio){

  var current="";
  var callbacks={};
  var activityTimeout=null;
  var sessionLength=600000;
  var initialWaitTime=500;
  var maxWaitTime=60000;

  function resetTimeout(time) {
    time=time||sessionLength;
    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout=setTimeout(presence,time);
  };

  var presenceWaitTime=initialWaitTime;

  function presence (callback) {
    return $.ajax({
      url:Traduxio.getId()+"/presence",
      type:"POST",
      dataType:"json"
    }).done(function(result) {
      if (result.user) {
        me=result.user;
        if (result.ok) online(me,result.anonymous);
      }
      if (result.users) {
        for (var user in result.users) {
          online(user,result.users[user].anonymous);
        }
        var names=Object.keys(result.users);
        for (var user in result.users) {
          if (names.indexOf(user)==-1) {
            offline(user);
          }
        }
      }
      if (result.sessionLength) {
        sessionLength=result.sessionLength;
      }
      presenceWaitTime=initialWaitTime;
      resetTimeout();
      if (typeof callback=="function") callback();
    }).fail(function(result) {
      presenceWaitTime*=2;
      presenceWaitTime=Math.min(presenceWaitTime,maxWaitTime);
      resetTimeout(presenceWaitTime);
    });
  };

  var leaving=false;
  function leave() {
    leaving=true;
    $.ajax({
      url:Traduxio.getId()+"/presence",
      type:"DELETE"
    });
  };

  $.extend(Traduxio,{
    activity:{
      register:function (type,callback) {
        callbacks[type]=callback;
      },
      wasActive:function() {
        resetTimeout();
      },
      getColor:function(user) {
        return getUser(user).color;
      },
      presence:presence
    }
  });

  var changeWaitTime=initialWaitTime;

  function listenChanges(id,seq) {
    $.ajax({
      url:id+"/changes/"+seq,
      dataType:"json"
    })
    .done(function(result) {
      if(result.last_seq!=seq) {
        seq=result.last_seq;
      }
      if (result.results && result.results.length>0) {
        checkActivity(id);
      }
      if (changeWaitTime==maxWaitTime) {
        Traduxio.chat.addMessage({message:"problème de connexion résolu",author:"Traduxio"});
      }
      changeWaitTime=initialWaitTime;
    })
    .fail(function() {
      if (changeWaitTime<maxWaitTime) {
        changeWaitTime*=2;
      }
      if (changeWaitTime>maxWaitTime) {
        changeWaitTime=maxWaitTime;
        Traduxio.chat.addMessage({message:"problème de connexion",author:"Traduxio"});
      }
    })
    .always(function() {
      setTimeout(listenChanges,changeWaitTime,id,seq);
    });
  };

  function checkActivity(id,delay,callback) {
    var url=id+"/activity";
    if (delay) url+="?delay="+delay;
    else if (current) url+="?since="+current;
    else {
      return {done:function(){}};
    }
    var s=initialWaitTime;
    function go(){
      $.ajax({
        cache:delay?false:true,
        url:url,
        dataType:"json"})
      .done(function(result) {
        if (result.now) current=result.now;
        if (result.activity) {
          try {
            result.activity.forEach(receivedActivity);
          } catch (E) {
            console.log(E);
          }
        }
        if (typeof callback =="function") callback();
      }).fail(function() {
        if (typeof callback =="function") {
          if (s>maxWaitTime) {
            alert("problème de connexion apparemment, essayez plus tard");
          } else {
            setTimeout(go,s);
            s*=2;
          }
        }
      });
    }
    go();
  };

  function receivedActivity(activity) {
    if (activity.seq && activity.seq < Traduxio.getSeqNum()) {
      activity.isPast=true;
    }
    if (activity.author==me) activity.isMe=true;
    if (activity.type!="session" && activity.author) {
      var user=getUser(activity.author);
      activity.anonymous=activity.anonymous || user.anonymous;
      activity.color=user.color;
    }
    if (activity.type && callbacks[activity.type]) {
      callbacks[activity.type](activity);
    }
  };

  function sessionInfo(activity) {
    if (activity.author)
      if (activity.entered) {
        if (!activity.isPast) online(activity.author,activity.anonymous);
        activity.message="est entré dans la traduction";
      }
      if (activity.left) {
        activity.message="est sorti de la traduction";
        if (!activity.isPast) {
          if (activity.isMe) {
            leaving ? null : presence();
          } else {
            offline(activity.author);
          }
        }
      }
      if (activity.rename) {
        activity.message="est maintenant connu comme "+activity.newname;
        var user=rename(activity.author,activity.newname,activity.anonymous,!activity.isPast);
      }
      if (Traduxio.chat && Traduxio.chat.addMessage) {
        user=user || getUser(activity.author);
        activity.color=user.color;
        Traduxio.chat.addMessage(activity);
      }
  }

  var users={};
  var offlineUsers={};
  var me="";
  var offset=0;
  var colors=["blue","peru","green","red","orangered","lightskyblue","purple","seagreen","tomato"];

  function currentColor() {
    return colors[offset++ % colors.length];
  }

  function getUser(username) {
    var user=users[username] || {};
    if (!user.color) {
      user.color=currentColor();
    }
    user.name=username;
    users[username]=user;
    return user;
  }

  function rename(username,newname,anonymous,update) {
    if (!username in users || newname in users) {
      user=getUser(newname);
    } else {
      user=getUser(username);
    }
    user.name=newname;
    if (anonymous) user.anonymous=true;
    else delete user.anonymous;
    users[newname]=user;
    delete users[username];

    if (update) {
      var oldUserDiv=$("[id='session-"+username+"']",sessionPane,sessionPane);
      var newUserDiv=$("[id='session-"+newname+"']",sessionPane,sessionPane);
      if (oldUserDiv.length && !newUserDiv.length) {
        userDiv=oldUserDiv;
        sessionPane.showPane(function(hide) {
          userDiv.fadeOut(function() {
            userDiv.attr("id","session-"+newname).empty().append($("<span>").addClass("name").append(newname)).prepend($("<span/>").addClass("colorcode"));
            $(".colorcode",userDiv).css({"background-color":user.color});
            if (user.anonymous) userDiv.addClass("anonymous");
            else userDiv.removeClass("anonymous");
            if (user.name == me) userDiv.remove().appendTo($(".me",sessionPane).empty());
            userDiv.fadeIn(function(){hide(500);});
          });
        });
      } else if (!oldUserDiv.length) {
        online(newname,anonymous);
      } else {
        offline(username);
      }
    }
    return user;
  }

  function online(username,anonymous) {
    var added=false;
    var user=getUser(username);
    var userDiv=$("[id='session-"+username+"']",sessionPane,sessionPane);
    if (!userDiv.length) {
      userDiv=$("<div/>").attr("id","session-"+username).append($("<span>").addClass("name").append(username)).prepend($("<span/>").addClass("colorcode"));
      added=true;
    } else {
      if (me==username && !userDiv.parents().is(".me")
        || me != username && !userDiv.parents().is(".them")) {
          userDiv.remove();
          added=true;
      }
      userDiv.show();
    }
    $(".colorcode",userDiv).css({"background-color":user.color});
    if (anonymous) {
      userDiv.addClass("anonymous");
      user.anonymous=true;
    } else {
      userDiv.removeClass("anonymous");
      delete user.anonymous;
    }
    if (added) {
      if (me==username) {
        $(".me",sessionPane).empty().append(userDiv);
      } else {
        $(".them",sessionPane).append(userDiv.hide());
        sessionPane.showPane(function(hide) {
          userDiv.fadeIn(function() {
            hide(500);
          });
        });
      }
    }
  }

  function offline(username) {
    if (username !== me && sessionPane.has("[id='session-"+username+"']")) {
      sessionPane.showPane(function(hide) {
        $("[id='session-"+username+"']",sessionPane).fadeOut(function() {
          $(this).remove();
          hide(500);
        });
      });
    }
  }

  var defaultShowTime=5000;

  $.fn.showPane=function (after) {
    var hideBack=this.is(":hidden");
    var self=this;
    this.slideDown(function() {
      if (typeof after=="function") after(function(showtime) {
        if (typeof showtime == "undefined") showTime=defaultShowTime;
        if (hideBack && showtime) {
          self.show().delay(showtime).slideUp();
        }
      });
    });
  };

  var sessionPane;

  $(document).ready(function(){
    var id = Traduxio.getId();
    if (id) {
      var p=initialWaitTime;
      presence(function() {
        Traduxio.activity.register("session",sessionInfo);
        checkActivity(id,86600,function(){
          listenChanges(id,Traduxio.getSeqNum());
        });
      });
      $(window).on("beforeunload",leave);
      Traduxio.addCss("sessions");
      sessionPane=$("<div/>").attr("id","sessions");
      sessionPane.append($("<h1/>").on("click",function() {
        sessionPane.slideUp();
      }).text("Vous êtes")).append($("<div/>").addClass("me"));
      sessionPane.append($("<h1/>").text("Collaborateurs")).append($("<div/>").addClass("them"));
      sessionPane.hide();
      sessionPane.on("click",".me div.anonymous span.name",function () {
        var me=$(this);
        $("<input/>").val(me.hide().text()).insertAfter(me).on("focusout",function() {
          var input=$(this);
          var newname=input.val().trim();
          function abort() {
            input.remove();
            me.show();
          }
          if (newname!=me.text()) {
            $.ajax({
              url:Traduxio.getId()+"/presence",
              type:"POST",
              data:JSON.stringify({changename:newname}),
              dataType:"json"
            }).done(function(result) {
              if (result.ok) {
                me.text(newname).show();
                input.remove();
              } else abort();
            }).fail(abort);
          } else {
            abort();
          }
        });
      });
      $(body).append(sessionPane);
      var button=$("<span/>").attr("id","show-sessions")
        .attr("title","Collaborateurs")
        .on("click",function() {
          sessionPane.slideToggle();
        }).insertBefore("#header form.concordance");
    }
  });

})(jQuery,Traduxio);
