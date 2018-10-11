function (o) {
  if(o.title !== undefined) {
    var languages=[];
    var privileges={};
    if (o.text) {
      privileges=o.privileges;
    }
    if (o.translations) {
      for (var trname in o.translations) {
        var tr=o.translations[trname];
        if (tr.language && languages.indexOf(tr.language)==-1) {
          languages.push(tr.language);
        }
        if (tr.privileges && !o.text) {
          if (tr.privileges.public) privileges.public=true;
          if (tr.privileges.sharedTo) {
            privileges.sharedTo=privileges.sharedTo||[];
            privileges.sharedTo=privileges.sharedTo.concat(tr.privileges.sharedTo);
          }
        }
      }
    }
    emit([o.language, o.creator, o.title], {
      title:o.title,
      original:o.text?true:false,
      languages: languages,
      privileges: privileges
    });
  }
}
