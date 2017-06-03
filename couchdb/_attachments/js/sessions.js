(function($,Traduxio){

  function entered(activity) {
    var added=false;
    var userDiv=$("[id='session-"+activity.author+"']",sessionPane,sessionPane);
    if (!userDiv.length) {
      userDiv=$("<div/>").attr("id","session-"+activity.author)
        .append($("<span>").addClass("name").append(activity.author))
        .prepend($("<span/>").addClass("colorcode"));
      added=true;
    } else {
      if (activity.isMe && !userDiv.parents().is(".me")
        || !activity.isMe && !userDiv.parents().is(".them")) {
          userDiv.remove();
          added=true;
      }
      userDiv.show();
    }
    $(".colorcode",userDiv).css({"background-color":activity.color});
    if (activity.anonymous) {
      userDiv.addClass("anonymous");
    } else {
      userDiv.removeClass("anonymous");
    }
    if (added) {
      if (activity.isMe) {
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

  function left(activity) {
    if (!activity.isMe && sessionPane.has("[id='session-"+activity.author+"']")) {
      sessionPane.showPane(function(hide) {
        $("[id='session-"+activity.author+"']",sessionPane).fadeOut(function() {
          $(this).remove();
          hide(500);
        });
      });
    }
  }

  function sessionInfo(activity) {
    if (!activity.isPast && activity.author) {
      if (activity.entered) {
        entered(activity);
      }
      if (activity.left) {
        left(activity);
      }
    }
  }

  var sessionPane;

  $(document).ready(function() {
    Traduxio.addCss("sessions");
    sessionPane=$("<div/>").attr("id","sessions");
    sessionPane.append($("<h1/>").on("click",function() {
      sessionPane.slideUp();
    }).text("Vous êtes")).append($("<div/>").addClass("me"));
    sessionPane.append($("<h1/>").text("Collaborateurs")).append($("<div/>").addClass("them"));
    sessionPane.hide();
    $(body).append(sessionPane);
    var button=$("<span/>").attr("id","show-sessions")
      .attr("title","Collaborateurs")
      .on("click",function() {
        sessionPane.slideToggle();
      }).insertBefore("#header form.concordance");
    Traduxio.activity.register("session",sessionInfo);

  });

})(jQuery,Traduxio);
