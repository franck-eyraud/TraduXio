(function($,Traduxio){

  var defaultMessage="Ceci est le chat traduxio pour ce texte";

  var chatContent,chatWindow,firstMessage;

  function createChat() {
    Traduxio.addCss("chat");
    var chatOuter = $("<div/>").attr("id","chat");
    var header=$("<h1/>").text("Chat");
    chatWindow=$("<div/>").addClass("chat").hide();
    chatContent=$("<div/>").addClass("chat-content");
    var chatForm=$("<form>")
      .append($("<input/>",{type:"text",name:"message"}))
      .append($("<input/>",{type:"submit",name:"submit"}));
    chatOuter.append(header).append(chatWindow);
    chatWindow.append(chatContent).append(chatForm);
    header.on("click",function() {
      chatWindow.slideToggle(function(){
        if (chatWindow.is(":visible")) {
          if (unread.length) {
            chatContent.clearQueue().animate({scrollTop:chatContent.scrollTop()+unread.filter(":first").position().top});
            unread.delay(1000).queue(function() {
              $(this).removeClass("unread");
            });
          }
          chatOuter.removeClass("unread");
        }
      });
      var unread=chatOuter.find("div.message.unread");
    });
    chatForm.on("submit",function(e) {
      e.preventDefault();
      var input=$("input[name=message]",this);
      var msg=input.val();
      if (msg) {
        $(input,this).attr("disabled","disabled");
        $.ajax({
          url:Traduxio.getId()+"/chat",
          type:"POST",
          dataType:"json",
          data:msg,
          success:function(result) {
            //addMessage(result);
            input.val("");
          },
          complete:function() {
            $(input,this).attr("disabled",null);
            Traduxio.activity.wasActive();
          }
        });
      }
    });
    $("#body").append(chatOuter);
    firstMessage=addMessage({author:"TraduXio",when:new Date().toISOString(),message:defaultMessage});
  }

  function addMessage(message) {
    if (message.message) {
      var div=$("<div/>").addClass("message");
      var author=$("<span/>").addClass("chat-author").text(message.author || "anonyme");
      var date=$("<span/>").addClass("date").attr("title",message.when || "date inconnue")
        .text(new Date(message.when).toLocaleString());
      div.append(date).append(author).append(message.message || "empty");
      author.css({color:message.color});

      if (!message.isPast) {
        chatContent.append(div);
        if (!message.isMe) {
          div.addClass("unread");
          if (chatContent.is(":hidden")) {
            $("#chat").addClass("unread");
          }
        }
      } else {
        div.insertBefore(firstMessage);
      }
      if (chatContent.is(":visible")) {
        chatContent.clearQueue().animate({scrollTop:chatContent.get(0).scrollHeight}).delay(1000).queue(function() {
          $("#chat .unread").removeClass("unread");
        });
      }
      return div;
    }
  }

  $.extend(Traduxio,{
    chat:{addMessage:addMessage}
  });

  $(document).ready(function() {
    if (Traduxio.getId()) {
      createChat();
      Traduxio.activity.register("forum",function(message) {
        if (message.forum!="chat") {
          message.message="écrit dans le forum "+message.forum+":"+message.message;
        }
        addMessage(message);
      });
    }
  });
})(jQuery,Traduxio);
