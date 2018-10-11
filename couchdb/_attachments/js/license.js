function update() {
  $("div.cc.derivatives").removeClass("nd sa");
  $("div.cc.commercial").removeClass("nc");
  if ($("input[type=radio][name=creative]:checked").val()=="no") {
    $("div.cc.attribution").removeClass("by");
    $("input[type=radio][name=derivatives]").prop("disabled",true);
    $("input[type=radio][name=commercial]").prop("disabled",true);
    $("div.license-name").html(Traduxio.getTranslated("i_all_rights_reserved"));
    $("div.fc-dubious").hide();
  } else {
    $("div.cc.attribution").addClass("by");
    $("input[type=radio][name=derivatives]").prop("disabled",false);
    $("input[type=radio][name=commercial]").prop("disabled",false);
    $("div.cc.derivatives").addClass($("input[type=radio][name=derivatives]:checked").val());
    $("div.cc.commercial").addClass($("input[type=radio][name=commercial]:checked").val());
    $("div.license-name").html(getLicense());
    $("div.fc-dubious").show();
  }
  $("input[type=submit]").prop("disabled",getLicense()==license);
}

function getLicense() {
  var license="";
  if ($("input[type=radio][name=creative]:checked").val()=="no") {
    return license;
  }
  license="by";
  var commercial=$("input[type=radio][name=commercial]:checked").val();
  if (commercial!="EMPTY") {
    license+="-"+commercial;
  }
  var derivatives=$("input[type=radio][name=derivatives]:checked").val();
  if (derivatives!="EMPTY") {
    license+="-"+derivatives;
  }
  return license;
}

function goBack() {
  window.location=getPrefix()+"/works/"+$(".full").data("id");
}

function submitLicense(e) {
  e.preventDefault();
  var id = $(".full").first().data("id");
  var tmp = document.location.pathname.split("/");
  var ref = tmp[tmp.length - 1];
  $.ajax({
    type:"PUT",
    url: $("body").data("prefix") + "/works/work/"+id+"/"+ref,
    contentType:"text/plain",
    data:JSON.stringify({"creativeCommons": getLicense()})
  }).done(goBack).fail(function() {
    alert("failed!");
  });
}

$(document).ready(function() {
  if (!license) {
    $("input:radio[name='creative'][value='no']").prop("checked",1);
    $("input:radio[name='derivatives'][value='nd']").prop("checked",1);
    $("input:radio[name='commercial'][value='nc']").prop("checked",1);
  } else {
    $("input:radio[name='creative'][value='yes']").prop("checked",1);
    if (license.indexOf("sa")>-1) {
      $("input:radio[name='derivatives'][value='sa']").prop("checked",1);
    } else if (license.indexOf("nd")>-1) {
      $("input:radio[name='derivatives'][value='nd']").prop("checked",1);
    } else {
      $("input:radio[name='derivatives'][value='EMPTY']").prop("checked",1);
    }
    if (license.indexOf("nc")>-1) {
      $("input:radio[name='commercial'][value='nc']").prop("checked",1);
    } else {
      $("input:radio[name='commercial'][value='EMPTY']").prop("checked",1);
    }
  }

  $("input").on("change",update);
  update();

  $("form#license").on("submit",submitLicense);
  $("form#license input[name=cancel]").on("click",goBack);
});
