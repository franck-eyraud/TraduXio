function(o) {
/*  function getUsers(doc) {
    if (doc.privileges) {
      if (doc.privileges.owner) {
        emit (doc.privileges.owner);
      }
      if (doc.privileges.sharedTo) {
        doc.privileges.sharedTo.forEach(function(user) {
          emit (user);
        });
      }
    }
  }

  getUsers(o);
  if (o.translations) {
    for (var i in o.translations) {
      getUsers(o.translations[i]);
    }
  }*/
  if (o._id=="known_users") {
    for (var userid in o) {
      if (o[userid].name && o[userid].name==userid) {
        emit(userid,o[userid].fullname || userid);
      }
    }
  }
}
