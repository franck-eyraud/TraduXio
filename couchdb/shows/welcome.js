function(o, req) {
  return {body:"redirect",code:302,headers:{"Location":"works/"}};
  // !code lib/mustache.js
  // !code lib/hexapla.js
  // !code lib/path.js
 
  return Mustache.to_html(this.templates.welcome, {});
}
