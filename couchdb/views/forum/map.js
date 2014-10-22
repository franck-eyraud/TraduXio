function(doc) {
  if (doc.messages) {
    var s;
    for (s in doc.messages) {
      doc.messages[s].forEach(function(t,i) {
        var timestamp=new Date(t.when).getTime();
        emit([doc._id,s,timestamp,i],{
          message:t,
          index:i,
          work:{
            creator:doc.creator?doc.creator:"Anonymus",
            title:doc.title,
            id:doc._id
          }
        });
      });
    }
  }
}