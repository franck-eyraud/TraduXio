function(work, req) {
  var doc=work;
  //!code lib/traduxio.js

  var args = JSON.parse(req.body);
  if(args.key == "remove") {
	work._deleted = true;
	return [work, "document removed"];
  }
  if (work===null) {
    Traduxio.doc=doc=work=args;
    work._id=work.id || req.id || req.uuid;
    work.creator=work["work-creator"];
    delete work["work-creator"];
    if (work.original) {
        work.text=work.text || [];
        work.translations={};
    } else {
        delete work.text;
        work.translations={"first":{text:[]}};
    }
    work.edits=[];
    Traduxio.addActivity(work.edits,{action:"created"});
    return [work, JSON.stringify({ok:"created",id:work._id})];
  }

  Traduxio.fixTranslations();

  work.edits=work.edits||[];

  var version = req.query.version;
  if (version) version=version.trim();
  if(args.key == "delete") {
	delete work.translations[version];
  Traduxio.addActivity(work.edits,{action:"deleted",version:version});
	return [work, version + " deleted"];
  }
  var doc;
  if(version == "original") {
	doc = work;
  } else {
    if (args.key=="creator" && args.value.trim()==version) args.value=version=Traduxio.unique_version_name(version);
	if(!work.translations[version]) {
	  var l = 1;
	  if (work.text) l=work.text.length;
	  else if (work.translations) {
	    for (var t in work.translations) {
	      if (work.translations[t].text) {
	        l=Math.max(l,work.translations[t].text.length);
	      }
	    }
	  }
	  var text=[];
	  for(var i=0 ; i<l ; i++) {
		  text.push("");
	  }
	  work.translations[version] = { title: "", language: "", creator:"", text: text };
    Traduxio.addActivity(work.edits,{action:"created",version:version});
	}
	doc = work.translations[version];
  }
  Traduxio.addActivity(work.edits,{action:"edited",version:version,key:args.key,value:args.value});
  if(args.key == "work-creator") {
	doc.creator = args.value;
  } else if(args.key == "creator") {
	var name = args.value;
	if(name == undefined) {
	  name = "Unnamed document";
	} else {
	  name=name.trim();
	}
	if(name != version) {
	  name=Traduxio.unique_version_name(name);
	  work.translations[name] = doc;
	  delete work.translations[version];
	  return [work, name];
	} else {
	  return [work, version];
	}
  } else {
	doc[args.key] = args.value;
  }
  return [work, typeof args.value=="string"?args.value:JSON.stringify(args.value)];
}
