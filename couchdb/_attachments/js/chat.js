(function($,Traduxio){

  var chatContent,firstMessage;

  function createChat() {
    Traduxio.addCss("chat");
    var chatOuter = $("<div/>").attr("id","chat").hide();
    var header=$("<h1/>").text("Chat");
    var chatWindow=$("<div/>").addClass("chat");
    chatContent=$("<div/>").addClass("chat-content");
    var messageInput=$("<textarea/>",{type:"text",name:"message",placeholder:getTranslated("i_chat_enter_message")});
    var chatForm=$("<form>")
      .append($("<div/>").addClass("box-wrapper")
        .append($("<div/>").css("position","relative")
          .append(messageInput)
          .append($("<div/>").addClass("text"))
      ))
      .append($("<input/>",{type:"submit",name:"submit",value:getTranslated("i_chat_send_message")}));
    messageInput.on("change input cut paste",autoSize);
    messageInput.each(autoSize);
    chatOuter.append(header).append(chatWindow);
    chatWindow.append(chatContent).append(chatForm);
    var button=$("<span/>").attr("id","show-chat").attr("title","Chat")
      .on("click",function() {
        chatOuter.slideToggle(function() {
          var unread=chatOuter.find("div.message.unread");
          messageInput.each(autoSize);
          messageInput.focus();
          if (chatContent.is(":visible") && unread.length) {
            chatContent.clearQueue().animate({scrollTop:chatContent.scrollTop()+unread.filter(":first").position().top});
            unread.delay(1000).queue(function() {
              $(this).removeClass("unread");
              button.removeClass("unread");
            });
          }
        });
      }).insertBefore("#header form.concordance");
    header.on("click",function() {
      chatOuter.slideUp();
    });

    chatForm.on("submit",function(e) {
      e.preventDefault();
      var msg=messageInput.val();
      if (msg) {
        $(messageInput,this).attr("disabled","disabled");
        $.ajax({
          url:Traduxio.getId()+"/chat",
          type:"POST",
          dataType:"json",
          data:msg,
          success:function(result) {
            //addMessage(result);
            messageInput.val("");
            messageInput.each(autoSize);
          },
          complete:function() {
            $(messageInput,this).attr("disabled",null);
            messageInput.focus();
            Traduxio.activity.wasActive();
          }
        });
      }
    });
    $("#body").append(chatOuter);
    firstMessage=addMessage({author:"TraduXio",when:new Date().toISOString(),message:getTranslated("i_chat_first_message")});
  }

  function addMessage(message) {
    if (message.message) {
      var div=$("<div/>").addClass("message");
      var author=$("<span/>").addClass("chat-author").text(message.author || "anonyme");
      if (message.anonymous || !message.author) author.addClass("anonymous");
      var date=$("<span/>").addClass("date").attr("title",message.when || "date inconnue")
        .text(new Date(message.when).toLocaleString());
      if (message.type) div.addClass(message.type);
      div.append(date).append(author);
      if (message.type=="forum") div.append(stringToHtml(message.message.replace(/\n\n+/g,"\n\n")));
      else div.append(message.message || "empty");
      author.css({color:message.color});

      if (!message.isPast) {
        chatContent.append(div);
        if (!message.isMe) {
          div.addClass("unread");
          if (firstMessage && chatContent.is(":hidden")) {
            $("#show-chat").addClass("unread");
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
      Traduxio.activity.register("forum",addMessage);
    }
  });
})(jQuery,Traduxio);
