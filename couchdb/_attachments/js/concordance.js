$(document).ready(function() {
  $("#language").remove().appendTo("#filters").val($("table.concordance").data("search-language"));

});
