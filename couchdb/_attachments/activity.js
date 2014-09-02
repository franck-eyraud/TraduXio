
(function($,Traduxio){

  var current="";
  var seq="now";
  var callbacks={};

  $.extend(Traduxio,{
    activity:{
      register:function (type,callback) {
        callbacks[type]=callback;
      }
    }
  });

  function listenChanges(id) {
    $.ajax({
      url:id+"/changes/"+seq,
      dataType:"json",
      success:function(result) {
        if(result.last_seq!=seq) {
          seq=result.last_seq;
          checkActivity(id);
        }
        setTimeout(listenChanges,500,id);
      },
      fail:function() {
        setTimeout(listenChanges,1000,id);
      }
    }
    );
  };

  function checkActivity(id,delay) {
    var url=id+"/activity";
    if (delay) url+="?delay="+delay;
    else if (current) url+="?since="+current;
    $.ajax({
      cache:delay?false:true,
      url:url,
      dataType:"json",
      success:function(result) {
        if (result.now) current=result.now;
        if (result.activity) {
          try {
          result.activity.forEach(receivedActivity);
          } catch (E) {}
        };
      },
      fail:function(a,b,c,f) {
        alert("fail!");
      }
    });
  };

  function receivedActivity(activity) {
    if (activity.type && callbacks[activity.type]) {
      callbacks[activity.type](activity);
    }
  };

  $(document).ready(function(){
    var id = Traduxio.getId();
    //checkActivity(id,600);
    setTimeout(checkActivity,500,id,86600);
    listenChanges(id);

  });

})(jQuery,Traduxio);
