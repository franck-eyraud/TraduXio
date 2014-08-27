function(o) {
  const SIZE = 24;
  function format(text, begin) {
    return text.substr(begin, SIZE).toLowerCase();
  }

  for (var i in o.text) {
      send_text(o.text[i],o.language,{unit:i});
  }
  for (var t in o.translations) {
    var translation = o.translations[t];
    for (var i in translation.text) {
      send_text(translation.text[i],translation.language,{unit:i,translation:t});
    }
  }
  if (o.glossary && o.glossary.forEach)
    o.glossary.forEach(function(glossary_entry,i) {
      send_text(glossary_entry.src_sentence,glossary_entry.src_language,{glossary_entry:i});
      send_text(glossary_entry.target_sentence,glossary_entry.target_language,{glossary_entry:i,reverse:true});
    });

  function send_text(text,language,object) {
    const WORD_MATCHER = /[^\s"’'`\-]+/g;
    if (text) {
      var match;
      while ((match = WORD_MATCHER.exec(text))) {
        var begin = match.index;
        object.char=begin;
        emit(
          [language, format(text, begin)], object
        );
      }
    }
  }
}
