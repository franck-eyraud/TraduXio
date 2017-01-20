function(work, req) {
  // !code lib/traduxio.js
  // !code lib/mustache.js

  var version=req.query.version;

  var data={};
  data.work_title=work.title;
  data.work_creator=work.creator;
  data.work_date=work.date;
  data.text=null;
  data.name="text";
  data.css=true;
  data.i18n=localized();
  data.prefix="../../../";

  if (version) {
    if (version=="original") {
      data.work=work;
      data.work.creator=work.creator?work.creator:"Anonymous";
    } else if (work.translations && work.translations[version]) {
      data.work=work.translations[version];
      data.work.creator=data.i18n["i_trad"]+" "+version;
    }
  }

  return Mustache.to_html(this.templates.text, data, this.templates.partials);

}
