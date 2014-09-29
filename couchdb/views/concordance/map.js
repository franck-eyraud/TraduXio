function(o) {
  const SIZE = 24;

  var ideograms=["\\u3400-\\u9FFF","\\u3040-\\u30FF"].join("");
  var punctuation_signs=["'","`","\\-","\\uff0c","\\u3002"].join("");

  var regex="["+ideograms+"]|[^\\s"+punctuation_signs+ideograms+"]+";

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
  if (o.glossary)
    for (src_language in o.glossary) {
      if (src_language!="edits")
      for (src_sentence in o.glossary[src_language]) {
        for (target_language in o.glossary[src_language][src_sentence]) {
          var target_sentence=o.glossary[src_language][src_sentence][target_language];
          var glossary_entry={
            src:{language:src_language,sentence:src_sentence},
            target:{language:target_language,sentence:target_sentence}
          };
          send_text(src_sentence,src_language,{glossary_entry:glossary_entry});

          var target=glossary_entry.target;
          glossary_entry.target=glossary_entry.src;
          glossary_entry.src=target;
          send_text(target_sentence,target_language,{glossary_entry:glossary_entry});
        }
      }
    }

  function send_text(text,language,object) {
    const WORD_MATCHER = new RegExp(regex,"g");
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
