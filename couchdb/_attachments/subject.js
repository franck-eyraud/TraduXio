(function($) {
  function getSubject(form) {
    return $("input[name=subject]",form).val()
      || $("#forum").data("subject");
  }

  $(document).ready(function(){
    $("form#write").on("submit",function(e) {
      e.preventDefault();
      var input=$(this).find("textarea");
      var message=input.val();
      var subject=getSubject(this);
      if (message && subject) {
        var toEnable=input.add(this).attr("disabled","disabled");
        $.ajax({
          url:subject,
          type:"POST",
          dataType:"json",
          data:message,
          success:function(result) {
            window.location.href=subject;
          },
          error:function() {
            input.addClass("bad");
            toEnable.attr("disabled",null);
          }
        });
      } else {
        input.addClass("bad");
      }
    })
    .find("textarea").val("").on("keypress",function(e) {
      if (e.keyCode==13 && e.ctrlKey) {
        $("form#write").submit();
      }
    })
    .add("form#write input").attr("disabled",null);
  });
})(jQuery);