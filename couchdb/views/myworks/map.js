function (o) {
  function getInfo(trname) {
    var info={id:o._id};
    var doc;
    if (trname && trname!="original") {
      doc=o.translations[trname];
      info.creator=trname.work_creator || doc.creator;
    } else {
      trname="original";
      doc=o;
      info.creator=doc.creator;
    }
    if (doc) {
      info.title=doc.title || o.title;
      info.lines=doc.text.length;
      info.translations=o.translations.length;
      info.privileges=doc.privileges;
      info.when=last_edit(trname);
      info.version=trname;
      info.work_creator=doc.work_creator || o.creator;
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
  if (o.translations !== undefined && o.text !== undefined) {
    emit([o._id,"original"],getInfo());
    if (o.translations) {
      for (var trname in o.translations) {
        emit([o._id,trname],getInfo(trname));
      }
    }
  }
}
