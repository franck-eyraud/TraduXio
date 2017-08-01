function(o, req) {

  var js_i18n_elements=[
    "i_read","i_edit","i_show","i_search_concordance",
    "i_confirm_delete","i_delete_version","i_delete_original", "i_no_title", "i_no_author",
    "i_glossary_add_translation"
  ];

  var doc=o;
  // !code lib/traduxio.js
  // !code lib/mustache.js
  // !code lib/hexapla.js

  var i18n=localized();

  function getTextLength() {
    if (o.text)
      return o.text.length;
    for each (var version in o.translations)
      return version.text.length;
  }

  var newWork = false;

  if (o===null) {
    o={translations:{},language:getMyLanguage()};
    newWork=true;
    o.privileges={};
    if (Traduxio.getUser().name) {
      o.privileges.owner=Traduxio.getUser().name;
    } else {
      o.privileges.public=true;
    }
  }
  o.privileges=o.privileges||{};
  var data = {
    id: o._id,
    headers: [],
    units: [],
    rows:[],
    lines:1,
    i18n:i18n
  }
  if (Traduxio.canAccess(o)) {
    data.seq=req.info.update_seq;
    data.work_title=o.title;
    data.display_work_title=o.title?o.title:i18n["i_no_title"];
    data.work_creator=o.creator;
    data.display_work_creator=o.creator?o.creator:i18n["i_no_author"];
    data.work_language=o.language;
    data.original=o.text ? true : false;
    data.date=o.date;
    data.lines=getTextLength();
    data.canEdit=Traduxio.canEdit(o);
    data.canAccess=true;

    if (!newWork) {
      var hexapla = new Hexapla();
      var edited_versions=req.query.edit ? req.query.edit.split("|") : [];
      var opened_versions=req.query.open ? req.query.open.split("|") : [];
      if (o.text) {
        hexapla.addVersion({
          id: "original",
          text: o.text
        });
        data.headers.push({
          version: "original",
          is_original: true,
          title: o.title,
          language: o.language,
          date: o.date,
          raw:o.text,
          creativeCommons: o.creativeCommons,
          edited: (edited_versions.indexOf("original")!=-1),
          opened: (opened_versions.indexOf("original")!=-1),
          owner:o.privileges.owner
        });
      }

      for (var t in o.translations) {
        var translation = o.translations[t];
        translation.privileges=translation.privileges || {};
        if (Traduxio.canAccess(translation)) {
          hexapla.addVersion({
            id: t,
            text: Traduxio.canAccess(translation) ? translation.text : [""],
          });
          data.headers.push({
            version:t,
            title: translation.title,
            work_creator: translation.creator || "",
            creator: t,
            language: translation.language || "",
            date: translation.date,
            raw:Traduxio.canAccess(translation) ? translation.text : [],
            creativeCommons: translation.creativeCommons,
            canAccess: Traduxio.canAccess(translation),
            opened: Traduxio.canAccess(translation) && (opened_versions.indexOf(t)!== -1),
            canEdit: Traduxio.canEdit(translation),
            edited: Traduxio.canEdit(translation) && (edited_versions.indexOf(t)!== -1),
            owner:translation.privileges.owner
          });
        }
      }
      data.rows=hexapla.getRows();
    }

    data.page_title=data.work_creator+" : "+data.work_title;
    data.language=data.work_language;
    if (o.glossary) {
      var glossary=o.glossary;
    } else {
      glossary={};
    }
    delete glossary.edits;
    data.glossary=JSON.stringify(glossary);
    data.notext=o.text ? false : true;
    data.original=o.text ? true : (newWork ? true : false);
    if (data.headers.length==1) {
      data.justOneText=true;
      data.version=data.headers[0].version
    }
  }

  data.prefix="..";
  data.name="work";
  data.css=true;
  data.script=true;
  data.scripts=["jquery.selection","jquery.ajax-retry","activity","jquery.highlight"];
  if (this.couchapp.traduxio.chat) data.scripts.push("chat");
  if (this.couchapp.traduxio.sessions) data.scripts.push("sessions");

  return Mustache.to_html(this.templates.work, data, this.templates.partials);
}
