function(doc) {
  if (doc.messages) {
    var s;
    for (s in doc.messages) {
      var existing_messages=doc.messages[s].filter(function (a) {return typeof a !="undefined";});
      if (doc.messages[s].length) {
        var count=existing_messages.length;
        var last_message=existing_messages[count-1];
        var last_timestamp=new Date(last_message.when).getTime();
        last_message.index=doc.messages[s].length-1;
        while (last_message.index > 0 && typeof doc.messages[s][last_message.index]=="undefined") {
          last_message.index--;
        }
        emit([doc._id,-last_timestamp],{
          subject:s,
          count:count,
          last_message:last_message,
          work:{
            title:doc.title,
            creator:doc.creator?doc.creator:"Anonymus",
            id:doc._id
          }
        });
    }
    }
  }
}