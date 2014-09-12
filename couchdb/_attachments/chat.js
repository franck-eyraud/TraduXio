(function($,Traduxio){

  var defaultMessage="Ceci est le chat traduxio pour ce texte";

  var chatContent,chatWindow;

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
      chatWindow.clearQueue().slideToggle();
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
    addMessage({author:"TraduXio",when:new Date().toISOString(),message:defaultMessage});
  }

  function addMessage(message) {
    var div=$("<div/>").addClass("message");
    var author=$("<span/>").addClass("chat-author").text(message.author || "anonyme");
    var date=$("<span/>").addClass("date").attr("title",message.when || "date inconnue")
      .text(new Date(message.when).toLocaleString());
    div.append(date).append(author).append(message.message || "empty");
    author.css({color:message.color});

    function _add() {
      chatContent.append(div);
      chatContent.clearQueue().animate({scrollTop:chatContent.get(0).scrollHeight});
    }
    if (message.isMe) _add();
    else (chatWindow.showPane(_add));
  }

  $.extend(Traduxio,{
    chat:{addMessage:addMessage}
  });

  $(document).ready(function() {

    createChat();

    Traduxio.activity.register("forum",addMessage);

  });
})(jQuery,Traduxio);
