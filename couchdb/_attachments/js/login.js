function session() {
  return $.ajax({
    url:"/_session",
    dataType:"json"
  });
};

function updateUserInfo(ctx) {
  var sessionInfo=$("#session-info");
  if (ctx.name) {
    var userSpan=$("<span>").addClass("user").text(ctx.name);
    var logoutSpan=$("<span>").addClass("logout").text(Traduxio.getTranslated("i_logout")).on("click",function(){
      logout();
    });
    var edit=$("<input>").addClass("signup").attr("type","button").val(Traduxio.getTranslated("i_edit_user"));
    edit.on("click",function() {
      getUserInfo(ctx.name,function(userInfo) {
        var modal=addModal(editUserForm(userInfo,function() {
          modal.remove();
        }));
      })
    });
    sessionInfo.empty().append(userSpan).append(" - ").append(logoutSpan).append(edit);
  } else {
    var form=$("<form>").addClass("login");
    var username=$("<input>").addClass("username").attr("placeholder",Traduxio.getTranslated("i_username"));
    var password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password"));
    var go=$("<input>").addClass("go").attr("type","submit").val(Traduxio.getTranslated("i_login"));
    var signup=$("<input>").addClass("signup").attr("type","button").val(Traduxio.getTranslated("i_signup"));
    form.append(username).append(password).append(go).append(signup).on("submit",function(e) {
      e.preventDefault();
      var name=username.val();
      var passwd=password.val();
      if (name && passwd)
        login(username.val(),password.val()).fail(function() {
          username.add(password).addClass("bad");
        });
      else username.add(password).addClass("bad");
    });
    sessionInfo.empty().append(form);
    signup.on("click",function() {
      var modal=addModal(signUpForm(function() {
        modal.remove();
      }));
    });
  }
}

function logout() {
  $.ajax({
    url:"/_session",
    dataType:"json",
    type:"DELETE"
  }).done(function(result){
    window.location.href=window.location.href;
  });
}

function getUserInfo(username,callback) {
  // session().done(function(result){
  //   if (result.userCtx.name) {
      $.couch.db("_users").openDoc("org.couchdb.user:"+username,{success:callback});
  //   }
  // });
}

function login(name,password) {
 return $.ajax({
    url:"/_session",
    dataType:"json",
    type:"POST",
    data:"name="+encodeURIComponent(name)+"&password="+encodeURIComponent(password)
  }).done(function(result){
    if (result.ok) {
      result.name=result.name || name;
      window.location.href=window.location.href;
    }
  });
}

function register(name, email, password, callback) {
  $.couch.signup(
    {name:name,email:email},password,{
      success:function() {
        login(name,password);
      },
      error: callback
    }
  );
}

function editUserForm(userInfo,callback) {
  var form=$("<form>").addClass("user-info");
  var username=$("<input>").addClass("username").attr("disabled","disabled").attr("placeholder",Traduxio.getTranslated("i_username")).val(userInfo.name);
  var fullname=$("<input>").addClass("fullname").attr("placeholder",Traduxio.getTranslated("i_fullname")).val(userInfo.fullname);
  var email=$("<input>").addClass("email").attr("placeholder",Traduxio.getTranslated("i_email")).val(userInfo.email);
  var password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password"));
  var confirm_password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_confirm_password"));
  var go=$("<input>").addClass("go").attr("type","submit").val(Traduxio.getTranslated("i_save"));
  form.append(username).append(fullname).append(email).append(password).append(confirm_password).append(go).on("submit",function(e) {
    e.preventDefault();
    var bad=false;
    var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailRegExp.test(email.val())) {
      email.addClass("bad");
      bad=true;
    }
    if (password.val() && confirm_password.val()!=password.val()) {
      confirm_password.addClass("bad");
      bad=true;
    }
    if (bad) return;
    if (password.val()) userInfo.password=password.val();
    userInfo.email=email.val();
    userInfo.fullname=fullname.val();
    $.couch.db("_users").saveDoc(userInfo,{success:callback});
  });
  return form;
}

function signUpForm(callback) {
  var form=$("<form>").addClass("user-info");
  var username=$("<input>").addClass("username").attr("placeholder",Traduxio.getTranslated("i_username"));
  var fullname=$("<input>").addClass("fullname").attr("placeholder",Traduxio.getTranslated("i_fullname"));
  var email=$("<input>").addClass("email").attr("placeholder",Traduxio.getTranslated("i_email"));
  var password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password"));
  var confirm_password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_confirm_password"));
  var go=$("<input>").addClass("go").attr("type","submit").val(Traduxio.getTranslated("i_signup"));
  form.append(username).append(fullname).append(email).append(password).append(confirm_password).append(go).on("submit",function(e) {
    e.preventDefault();
    var bad=false;
    [username,email,password,confirm_password].forEach(function(control) {
      control.removeClass("bad");
      if (control.val().length<1) {
        control.addClass("bad");
        bad=true;
      }
    });
    if (confirm_password.val()!=password.val()) {
      confirm_password.addClass("bad");
      bad=true;
    }
    var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailRegExp.test(email.val())) {
      email.addClass("bad");
      bad=true;
    }
    if (bad) return;
    register(username.val(),email.val(),password.val(),function() {
      username.addClass("bad");
    });
  });
  return form;
}

$(document).ready(function() {
  session().done(function(result){
    updateUserInfo(result.userCtx);
  });
});
