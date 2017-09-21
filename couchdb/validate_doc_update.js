function (newDoc, oldDoc, userCtx, secObj) {
  var req={userCtx:userCtx,secObj:secObj};
  var doc=oldDoc;
  //!code lib/traduxio.js

  function mandatory(doc,attribute) {
    if (!doc.hasOwnProperty(attribute)) {
      throw({forbidden:"missing "+attribute});
    }
  }

  function shouldBeString(doc,attribute) {
    if (doc.hasOwnProperty(attribute) && !isString(doc[attribute])) {
      throw({forbidden:attribute+" must be a string"});
    }
  }

  function shouldBeArray(doc,attribute,callbackTest) {
    if (doc.hasOwnProperty(attribute) && !isArray(doc[attribute])) {
      throw({forbidden:attribute+" must be an array"});
    }
  }

  function shouldBeObject(doc,attribute) {
    if (doc.hasOwnProperty(attribute) && !isObject(doc[attribute])) {
      throw({forbidden:attribute+" must be an object"});
    }
  }

  function shouldBeEqual(obj1,obj2,attribute) {
    if ((typeof obj1==typeof obj2) && (typeof obj1=="object")) {
      log("obj1 and obj2 are both objects");
      obj1=obj1 || {};
      obj2=obj2 || {};
      if (!obj1.hasOwnProperty(attribute) && !obj2.hasOwnProperty(attribute))
        return;
      if (obj1.hasOwnProperty(attribute) && obj2.hasOwnProperty(attribute) &&
          !compare(obj1[attribute],obj2[attribute])
        || !obj1.hasOwnProperty(attribute) || !obj2.hasOwnProperty(attribute)) {
        throw({forbidden:attribute+" can't be changed"});
      }
    } else {
      log("obj1 and obj2 have different types");
      throw({forbidden:attribute+" can't be added or removed"});
    }
  }

  function isStringOrNull(val) {
    return isString(val) || isNull(val);
  }

  function isNull(val) {
    return val ===null;
  }

  function isString(val) {
    return typeof val ==="string" || typeof val === "number";
  }

  function isArray(val) {
    return (typeof val.forEach ==="function");
  }

  function isObject(val) {
    return typeof val === "object" && !isArray(val);
  }

  function mandatoryFields(fields,doc) {
    doc=doc || newDoc;
    fields.forEach(function(attribute) {
      mandatory(doc,attribute);
    });
  }

  function ensureStrings(fields,doc) {
    doc=doc || newDoc;
    fields.forEach(function(attribute) {
      shouldBeString(doc,attribute);
    });
  }

  function ensureObjects(fields,doc) {
    doc=doc || newDoc;
    fields.forEach(function(attribute) {
      shouldBeObject(doc,attribute);
    });
  }

  function ensureArrays(fields,doc) {
    doc=doc || newDoc;
    fields.forEach(function(attribute) {
      shouldBeArray(doc,attribute);
    });
  }

  function ensureUnchangedFields(fields,obj1,obj2) {
    obj1=obj1 || oldDoc;
    obj2=obj2 || newDoc;
    Traduxio.config.debug && log ("testing ["+fields.join(",")+"] with "+(typeof obj1)+","+(typeof obj2));
    if (typeof obj1=="object" && typeof obj2=="object" && obj1!=obj2) {
      fields.forEach(function(attribute) {
        shouldBeEqual(obj1,obj2,attribute);
      });
    } else {
      throw({forbidden:"can't check attribute of non object"});
    }
  }

  function testArray(array,callback,nullok) {
    var ok=false;
    if (isArray(array)) {
      ok=true;
      if (typeof callback=="function") {
        array.forEach(function(val) {
          if (!nullok && val===null) ok=false;
          else if (!callback(val)) {
            ok=false;
          }
        });
      }
    }
    return ok;
  }

  function compare(obj1,obj2) {
    if (Traduxio.config.debug && isString(obj1) && isString(obj2)) {
      log("comparing 2 strings '"+obj1+"' '"+obj2+"'");
    }
    if (typeof obj1 != typeof obj2) return false;
    if (typeof obj1 == 'object') {
      for (var k in obj1) {
        if (!compare(obj1[k],obj2[k])) return false;
      }
      for (var k in obj2) {
        if (! (k in obj1)) return false;
      }
      return true;
    } else {
      return obj1===obj2;
    }
  }

  if (newDoc._id=="known_users") {
    if (!Traduxio.isAdmin()) {
      throw({forbidden:"Access denied"});
    }
    return;
  }

  if (!Traduxio.canAccess(oldDoc)) {
    Traduxio.config.debug && log("can't access old");
    throw({forbidden:"Access denied"});
  }

  if (!Traduxio.canAccess(newDoc)) {
    Traduxio.config.debug && log("can't access new");
    throw({forbidden:"Access denied to modified doc"});
  }

  if (!Traduxio.canEdit(oldDoc)) {
    Traduxio.config.debug && log("can't edit old");
    ensureUnchangedFields(["title","language","creator","date","privileges","text"]);
  } else if (!Traduxio.isAdmin()){
    if (!oldDoc && !Traduxio.isOwner(newDoc) ) {
      throw({forbidden:"Must set owner to yourself"});
    }
  }

  if (newDoc._deleted && !Traduxio.canDelete(oldDoc)) {
    throw({forbidden:"Can't delete!"});
  }



  ensureArrays(["text"]);
  if (newDoc.text && !testArray(newDoc.text,isString)) {
    throw({forbidden:"text lines must be strings "+JSON.stringify(newDoc.text)});
  }
  mandatoryFields(["translations"]);
  ensureStrings(["creator","date","language","title"]);
  ensureObjects(["translations","glossary"]);
  Traduxio.config.debug && log("start checking trans");
  var canTranslate=Traduxio.canTranslate(oldDoc);
  for (var t in newDoc.translations) {
    var newTrans=newDoc.translations[t];
    mandatory(newTrans,"text");
    mandatory(newTrans,"language");
    shouldBeArray(newTrans,"text");
    Traduxio.config.debug && log("check translation "+t);
    if (oldDoc && oldDoc.translations && oldDoc.translations[t]) {
      var oldTrans=oldDoc.translations[t];
      //check that edit forbidden translations are not modified
      log(oldTrans);
      log(newTrans);
      if (!Traduxio.isOwner(oldDoc) && !Traduxio.canEdit(oldTrans) &&
          !compare(oldTrans,newTrans)) {
        throw({forbidden:"Can't modify translation "+t});
      }
    } else {
      if (!canTranslate) {
        throw({forbidden:"Can't add translation"});
      }
      if (!Traduxio.isAdmin() && !Traduxio.isOwner(newTrans)) {
        throw({forbidden:"Must set owner to yourself"});
      }
    }
  }
  if (oldDoc && oldDoc.translations) {
    for (var t in oldDoc.translations) {
      var oldTrans=oldDoc.translations[t];
      if (!newDoc.translations[t] && !Traduxio.canDelete(oldTrans)) {
        throw({forbidden:"Can't delete translation "+t});
      }
    }
  }
}
