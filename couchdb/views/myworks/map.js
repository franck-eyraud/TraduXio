function (o) {
  function getInfo(trname) {
    var info={};
    var doc;
    if (trname && trname!="original") {
      doc=o.translations[trname];
      info.creator=trname;
    } else {
      trname="original";
      doc=o;
      info.creator=doc.creator;
    }
    if (doc) {
      info.title=doc.title;
      info.lines=doc.text.length;
      info.translations=o.translations.length;
      info.privileges=doc.privileges;
      info.when=last_edit(trname);
    }
    return info;
  }
  function last_edit(version) {
    for (var i in o.edits) {
      if(o.edits[i].version==version && o.edits[i].when) {
         return o.edits[i].when;
      }
    }
  }
  if (o.title !== undefined) {
    emit([o._id,"original"],getInfo());
    if (o.translations) {
      for (var trname in o.translations) {
        emit([o._id,trname],getInfo(trname));
      }
    }
  }
}
