
(function($,Traduxio){

  var current="";
  var callbacks={};
  var activityInterval=null;
  var sessionLength=600000;

  function resetInterval() {
    if (activityInterval) clearInterval(activityInterval);
    activityInterval=setInterval(presence,sessionLength);
  };

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
    }).fail(function(result) {
      presence();
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

  function listenChanges(id,seq) {
    $.ajax({
      url:id+"/changes/"+seq,
      dataType:"json",
      success:function(result) {
        if(result.last_seq!=seq) {
          seq=result.last_seq;
          checkActivity(id);
        }
        setTimeout(listenChanges,500,id,seq);
      },
      fail:function() {
        setTimeout(listenChanges,1000,id,seq);
      }
    });
  };

  function checkActivity(id,delay) {
    var url=id+"/activity";
    if (delay) url+="?delay="+delay;
    else if (current) url+="?since="+current;
    return $.ajax({
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
      };
    })
    .fail(function(a,b,c,f) {
        alert("fail!");
    });
  };

  function receivedActivity(activity) {
    if (activity.type && callbacks[activity.type]) {
      callbacks[activity.type](activity);
    }
  };

  function sessionInfo(activity) {
    if (activity.author)
      if (activity.entered || activity.action=="entered") {
        online(activity.author);
      }
      if (activity.left || activity.action=="left") {
        if (activity.author==me) {
          presence();
          resetInterval();
        } else {
          offline(activity.author);
        }
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
    var user=getUser(username);
    var userDiv=$("#session-"+username,sessionPane,sessionPane);
    if (!userDiv.length) {
      userDiv=$("<div/>").attr("id","session-"+username).append(username).prepend($("<span/>").addClass("colorcode")).hide();
      added=true;
    }
    $(".colorcode",userDiv).css({"background-color":user.color});
    if (added) {
      if (me==username) {
        $(".me",sessionPane).empty().append(userDiv);
      } else {
        $(".them",sessionPane).append(userDiv);
      }
      sessionPane.slideDown(function() {
        userDiv.fadeIn();
      });
    }
  }

  function offline(username) {
    if (username !== me && sessionPane.has("#session-"+username)) {
      sessionPane.slideDown(function() {
        $("#session-"+username,sessionPane).fadeOut(function() {this.remove();});
      });
    }
  }

  var sessionPane;

  $(document).ready(function(){
    var id = Traduxio.getId();
    presence();
    resetInterval();
    listenChanges(id,Traduxio.getSeqNum());
    $(window).on("beforeunload",leave);
    setTimeout(function() {
      checkActivity(id,86600).done(function() {
        Traduxio.activity.register("session",sessionInfo);
      });
    },500);
    Traduxio.addCss("sessions");
    sessionPane=$("<div/>").attr("id","sessions");
    sessionPane.append($("<h1/>").text("Vous êtes")).append($("<div/>").addClass("me"));
    sessionPane.append($("<h1/>").text("Collaborateur")).append($("<div/>").addClass("them"));
    sessionPane.hide();
    $(body).append(sessionPane);
    var button=$("<span/>").attr("id","show-sessions").text("users").on("click",function() {
      sessionPane.slideToggle();
    }).css({cursor:"pointer",float:"right"}).insertBefore("#header form.concordance");
  });

})(jQuery,Traduxio);
