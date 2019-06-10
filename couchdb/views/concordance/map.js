function(o) {
  const MAX_SIZE = 124;
  const NB_WORDS = 10;
  const MAX_SEND = 200000;

  var ideograms=["\\u3400-\\u9FFF","\\u3040-\\u30FF"].join("");
  var punctuation_signs=["'","`","\\-","\\uff0c","\\u3002","\\(","\\)"].join("");

  var regex="["+ideograms+"]|[^\\s"+punctuation_signs+ideograms+"]+";

  function format(text, begin) {
    var SUB_WORD_MATCHER=new RegExp(regex,"g"),
        s=text.substr(begin),
        n=0, end=-1, m;
    while ((m=SUB_WORD_MATCHER.exec(s)) && n<NB_WORDS && end < MAX_SIZE) {
      n++;
      if (m.index+m[0].length > MAX_SIZE && n>1) {
        n=NB_WORDS; //force stop
      } else {
        end=m.index+m[0].length;
      }
    }

    return s.substr(0, end).toLowerCase();
  }

  var sent_so_far=0;

  if (o.glossary) {
    for (src_language in o.glossary) {
      if (src_language!="edits")
      for (src_sentence in o.glossary[src_language]) {
        for (target_language in o.glossary[src_language][src_sentence]) {
          var target_sentence=o.glossary[src_language][src_sentence][target_language];
          var glossary_entry={
            src:{language:src_language,sentence:src_sentence},
            target:{language:target_language,sentence:target_sentence}
          };
          sent_so_far=send_text(src_sentence,src_language,{glossary_entry:glossary_entry},sent_so_far);

          var target=glossary_entry.target;
          glossary_entry.target=glossary_entry.src;
          glossary_entry.src=target;
          sent_so_far=send_text(target_sentence,target_language,{glossary_entry:glossary_entry},sent_so_far);
        }
      }
    }
  }

  if (o.translations) {
    var nb_translations=Object.keys(o.translations).length;
    if (o.language && o.text && nb_translations > 0) {
      for (var i in o.text) {
        var text = o.text[i];
        if (text) {
          sent_so_far=send_text(text, o.language, {unit: i},sent_so_far);
        }
      }
    }
    if (o.text || nb_translations > 1) {
      for (var t in o.translations) {
        var translation = o.translations[t];
        if (translation.language && translation.text) {
          for (var i in translation.text) {
            var text = translation.text[i];
            if (text) {
              sent_so_far=send_text(text, translation.language, {unit: i, translation: t},sent_so_far);
            }
          }
        }
      }
    }
  }

  not_sent=0;

  function send_text(text,language,object,sent_so_far) {
    const WORD_MATCHER = new RegExp(regex,"g");
    if (text) {
      var match;
      while ((match = WORD_MATCHER.exec(text)) && sent_so_far < MAX_SEND) {
        var begin = match.index;
        object.char=begin;
        emit(
          [language, format(text, begin)], object
        );
        sent_so_far++;
      }
    }
    return sent_so_far;
  }

  if (sent_so_far >= MAX_SEND) {
    log("concordance.map: warning : too much concordance matches for "+o._id+" ("+MAX_SEND+" max matches");
  }

}
