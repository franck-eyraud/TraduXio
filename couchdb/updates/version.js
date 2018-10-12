function(old, req) {
  var doc=old;
  //!code lib/traduxio.js

  function isEmpty(string) {
    return string === null || typeof string !== "string" || string.trim() === "";
    if (string === null) return true;
    if (typeof string !== "string") return false;
    if (string.trim() !== "") return false;
    return true;
  }

  function Work() {
    this.data = old;
    this.getVersion = function(version) {
      return this.isOriginal(version)
        ? this.data
        : this.data.translations[version];
    };
    this.get = function(version) {
      return this.isOriginal(version) ? this.data :
        this.data.translations[version];
    };
    this.exists = function(version) {
      return this.isOriginal(version) ||
        this.data.translations.hasOwnProperty(version);
    };
    this.isOriginal = function(version) {
      return version=="original";
    };
    this.getContent = function(version, line) {
      if (this.exists(version)) {
        var text=this.getVersion(version).text;
        return text ? text[line] : false;
      } else {
        return false;
      }
    };
    this.textLength = function(version) {
      if (version=="original") {
        if (work.data.text) return work.data.text.length;
        else {
          length=1;
          for (var tr in work.data.translations) {
            length=Math.max(work.data.translations[tr].text.length,length);
          }
          return length;
        }
      } else {
        return work.data.translations[version].text.length;
      }
    };
    this.setContent = function(version, line, content) {
      if (this.isOriginal(version)) {
        if (line>=this.data.text.length) {
            for(i=this.data.text.length;i<line;i++) {
                this.data.text.push("");
            }
        }
        this.data.text[line] = content;
      } else {
        this.data.translations[version].text[line] = content;
      }
    };
  }

  const VERSION_ID = req.query.version;
  const LINE = +req.query.line;
  var work = new Work();
  if (!work.exists(VERSION_ID)) {
    return [null, {code:400,body:"incorrect version "+VERSION_ID}];
  }
  if (!Traduxio.canEdit(work.get(VERSION_ID))) {
    return [null, {code:403,body:"can't modify "+VERSION_ID}];
  }
  if (LINE!==parseInt(LINE, 10) || LINE<0
    || LINE>work.textLength(VERSION_ID) && (new_content!=null || !work.isOriginal(VERSION_ID))
    || LINE>work.textLength(VERSION_ID)+1) {
    return [null, {code:400,body:"incorrect line "+LINE}];
  }
  var old_content = work.getContent(VERSION_ID, LINE),
      new_content,error=false;
  if (req.method=="DELETE") {
    if (work.isOriginal(VERSION_ID)) {
      //delete on bloc in original version
      if (work.data.text) {
        if (!isEmpty(work.getContent(VERSION_ID,LINE))) {
          return [null, {code:400,body:"line "+LINE+" is not empty for version "+VERSION_ID+" "+work.getContent(VERSION_ID,LINE)+JSON.stringify(work.data.text)}];
        } else {
          work.data.text.splice(LINE,1);
        }
      }

      for (var tr in work.data.translations) {
        if (!isEmpty(work.getContent(tr,LINE))) {
          return [null, {code:400,body:"line "+LINE+" is not empty for version "+tr+" "+work.getContent(tr,LINE)}];
        } else {
          work.data.translations[tr].text.splice(LINE,1);
        }
      }
      Traduxio.addActivity(doc.edits,{action:"removed",line:LINE});
      return [work.data, "removed an empty block at line " + LINE];
    } else {
      return [null, {code:400,body:"can't remove line "+LINE}];
    }
  }
  try {
    new_content = JSON.parse(req.body);
  } catch (e) {
    error="incorrect JSON";
    new_content=-1;
  }
  if (!error && (typeof new_content != "string") && new_content != null) {
    error=(typeof new_content)+" is not a valid type";
  }
  if (error) {return [null, {code:400,body:"incorrect input "+error}];}
  if (new_content!==old_content) {
    if (new_content==null && !work.isOriginal(VERSION_ID)) {
      var previous_line = LINE;
      var previous_line_content;
      if (previous_line==0) {
        return [null, {code:400,body:"can't merge before first line !"}];
      }
      do {
        previous_line_content = work.getContent(VERSION_ID, --previous_line);
      } while (previous_line_content==null);
      var joined_content = previous_line_content + "\n" + old_content;
      work.setContent(VERSION_ID, previous_line, joined_content);
      new_content = null;
      //Traduxio.addActivity(this.data.edits,{action:"joined",version:VERSION_ID,line:LINE});
    } else if (new_content==null && work.isOriginal(VERSION_ID)) {
      if (work.data.text) work.data.text.splice(LINE,0,"");
      for (var tr in work.data.translations) {
        if (work.getContent(tr,LINE)===null) {
          work.data.translations[tr].text.splice(LINE,0,null);
        } else {
          work.data.translations[tr].text.splice(LINE,0,"");
        }
      }
      doc.edits=doc.edits || [];
      Traduxio.addActivity(doc.edits,{action:"inserted",line:LINE});
      return [work.data, "inserted a new block at line " + LINE];
    }
    doc.edits=doc.edits || [];
    Traduxio.addActivity(doc.edits,{action:"translated",version:VERSION_ID,line:LINE,old:old_content,content:new_content});
    work.setContent(VERSION_ID, LINE, new_content);
    return [work.data, VERSION_ID + " updated at line " + LINE];
  }
  return [null, VERSION_ID + " unchanged at line " + LINE];
}
