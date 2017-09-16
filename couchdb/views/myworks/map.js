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
      info.workd_creator=doc.creator;
    }
    if (doc) {
      info.title=doc.title;
      info.lines=doc.text.length;
      info.translations=o.translations.length;
      info.privileges=doc.privileges;
      info.last_edit=last_edit(trname);
      info.version=trname;
      info.work_creator=doc.creator;
      info.language=doc.language;
    }
    return info;
  }
  function last_edit(version) {
    var last=new Date(0).toISOString();
    for (var i in o.edits) {
      if((!version || o.edits[i].version==version) && o.edits[i].when && o.edits[i].when > last) {
         last=o.edits[i].when;
      }
    }
    return last;
  }
  if (o.translations !== undefined && o.text !== undefined) {
    var i=0;
    emit([last_edit(),o._id,""],getInfo());
    if (o.text) {
      emit([last_edit(),o._id,last_edit("original"),"original"],getInfo());
    }
    if (o.translations) {
      i=1;
      for (var trname in o.translations) {
        emit([last_edit(),o._id, last_edit(trname),trname],getInfo(trname));
      }
    }
  }
}
