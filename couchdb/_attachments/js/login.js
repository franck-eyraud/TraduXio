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

function getUserInfo(username,callback,failcallback) {
  $.couch.db("_users").openDoc("org.couchdb.user:"+username,{success:callback,error:failcallback});
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

function register(data, password, callback) {
  $.couch.signup(
    data,password,{
      success:function() {
        login(data.name,password);
      },
      error: callback
    }
  );
}

function emailConfirm(username,confirm_key,retrycount) {
  getUserInfo(username,function(userInfo) {
    if (userInfo.confirm_key) {
      if(userInfo.roles.indexOf("confirmed")!=-1) {
        if (retrycount) {
          alert("email confirmed");
        } else {
          alert("email already confirmed");
        }
        window.location.search="";
      } else if (retrycount>4) {
        alert("confirmation failed");
        window.location.search="";
      }
    } else if (userInfo.failed_confirm_key && userInfo.failed_confirm_key==confirm_key) {
      alert("confirmation failed")
      window.location.search="";
    }
    userInfo.confirm_key=confirm_key;
    $.couch.db("_users").saveDoc(userInfo,{
      success:function() {
        retrycount=retrycount || 0;
        retrycount++;
        setTimeout(emailConfirm,2000,username,confirm_key,retrycount);
      }
    });
  },function(error) {
    alert("error confirming "+error);
  });
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
    var data={
      name:username.val(),
      email:email.val(),
      fullname:fullname.val()
    }
    register(data,password.val(),function(err) {
      console.log(err);
      username.addClass("bad");
    });
  });
  return form;
}

function getParameterByName(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

$(document).ready(function() {
  session().done(function(result) {
    updateUserInfo(result.userCtx);
    if (getParameterByName("email_confirm")) {
      if (!result.userCtx.name) {
        alert("Please log in to confirm your email");
      } else {
        emailConfirm(result.userCtx.name,getParameterByName("email_confirm"));
      }
    }
  });
});
