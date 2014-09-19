
(function($,Traduxio){

  var current="";
  var callbacks={};
  var activityInterval=null;
  var sessionLength=600000;
  var initialWaitTime=500;
  var maxWaitTime=60000;

  function resetInterval() {
    if (activityInterval) clearInterval(activityInterval);
    activityInterval=setInterval(presence,sessionLength);
  };

  var presenceWaitTime=initialWaitTime;

  function presence () {
    return $.ajax({
      url:Traduxio.getId()+"/presence",
      type:"POST",
      dataType:"json"
    }).done(function(result){
      if (result.user) {
        me=result.user;
        if (result.ok) online(me);
      }
      if (result.users) {
        for (var user in result.users) {
          online(user);
        }
      }
      if (result.sessionLength) {
        sessionLength=result.sessionLength;
      }
      presenceWaitTime=initialWaitTime;
    }).fail(function(result) {
      setTimeout(presence,presenceWaitTime);
      presenceWaitTime*=2;
      presenceWaitTime=Math.max(presenceWaitTime,maxWaitTime);
    });
  };

  function leave() {
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
        resetInterval();
      },
      getColor:function(user) {
        return getUser(user).color;
      }
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
    if (activity.author) {
      if (activity.author==me) activity.isMe=true;
      activity.color=getUser(activity.author).color;
    }
    if (activity.seq && activity.seq < Traduxio.getSeqNum()) {
      activity.isPast=true;
    }
    if (activity.type && callbacks[activity.type]) {
      callbacks[activity.type](activity);
    }
  };

  function sessionInfo(activity) {
    if (activity.author)
      if (activity.entered || activity.action=="entered") {
        if (!activity.isPast) online(activity.author);
        activity.message="est entré dans la traduction";
      }
      if (activity.left || activity.action=="left") {
        activity.message="est sorti de la traduction";
        if (!activity.isPast) { 
          if (activity.isMe) {
            presence();
            resetInterval();
          } else {
            offline(activity.author);
          }
        }
      }
      if (Traduxio.chat && Traduxio.chat.addMessage) {
        Traduxio.chat.addMessage(activity);
      }
  }

  var users={};
  var offlineUsers={};
  var me="";
  var colors=["blue","peru","green","red","orangered","lightskyblue","purple","seagreen","tomato"];

  function currentColor() {
    return colors[Object.keys(users).length % colors.length];
  }

  function getUser(username) {
    var user=users[username] || {};
    if (!user.color) {
      user.color=currentColor();
    }
    users[username]=user;
    return user;
  }

  function online(username) {
    var added=false;
    var user=getUser(username);
    var userDiv=$("[id='session-"+username+"']",sessionPane,sessionPane);
    if (!userDiv.length) {
      userDiv=$("<div/>").attr("id","session-"+username).append(username).prepend($("<span/>").addClass("colorcode"));
      added=true;
    }
    $(".colorcode",userDiv).css({"background-color":user.color});
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
          this.remove();
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
      presence().done(function() {
        Traduxio.activity.register("session",sessionInfo);
        checkActivity(id,86600,function(){
          listenChanges(id,Traduxio.getSeqNum());
        });
        resetInterval();
      }).fail(function() {
        if (p>maxWaitTime) {
          alert("problème de connexion apparemment, essayez plus tard");
          alert(JSON.stringify(arguments));
        } else {
          setTimeout(presence,p);
          p*=2;
        }
      });
      $(window).on("beforeunload",leave);
      Traduxio.addCss("sessions");
      sessionPane=$("<div/>").attr("id","sessions");
      sessionPane.append($("<h1/>").text("Vous êtes")).append($("<div/>").addClass("me"));
      sessionPane.append($("<h1/>").text("Collaborateurs")).append($("<div/>").addClass("them"));
      sessionPane.hide();
      $(body).append(sessionPane);
      var button=$("<span/>").attr("id","show-sessions").
        append(
            $("<img>").attr("src",getPrefix()+"/shared/users.png").css({height:32,width:32}).attr("title","Collaborateurs")
        )
        .on("click",function() {
          sessionPane.slideToggle();
        }).css({cursor:"pointer",float:"right"}).insertBefore("#header form.concordance");
    }
  });

})(jQuery,Traduxio);
