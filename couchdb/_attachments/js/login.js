function session() {
  return $.ajax({
    url:"/_session",
    dataType:"json"
  });
};

function fixUsername(username) {
  var fixedUsername=username.toLowerCase().trim().replace(/\s+/g,".");
  var usernameRegExp=/^[a-z][\.a-z0-9-_]+$/;

  if (!usernameRegExp.test(fixedUsername)) {
    return false;
  }
  return fixedUsername;
}

function updateUserInfo(ctx) {
  var sessionInfo=$("#session-info");
  if (ctx.name) {
    var userSpan=$("<span>").addClass("user click-enabled").text(ctx.name);
    if (ctx.roles && ctx.roles.indexOf("confirmed")==-1) {
      userSpan.append(" - not confirmed");
    }
    var logoutSpan=$("<span>").addClass("logout click-enabled").text(Traduxio.getTranslated("i_logout")).on("click",function(){
      logout();
    });
    userSpan.on("click",function() {
      getUserInfo(ctx.name,function(userInfo) {
        var modal=addModal(editUserForm(userInfo,function() {
          modal.remove();
        }),getTranslated("i_edit_user"));
      })
    });
    sessionInfo.empty().append(userSpan).append(" - ").append(logoutSpan);
  } else {
    var userSpan=$("<span>").addClass("anonymous").append("anonymous");
    var loginSpan=$("<span>").addClass("login click-enabled").text(Traduxio.getTranslated("i_login")).on("click",function(){
      var modal=addModal(loginForm(function() {
        modal.remove();
      }),getTranslated("i_login"));
    });
    sessionInfo.empty().append(userSpan).append(" - ").append(loginSpan);
  }
}

function logout() {
  $.ajax({
    url:"/_session",
    dataType:"json",
    type:"DELETE"
  }).done(function(result){
    window.location.reload();
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
      window.location.reload();
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

function waitConfirm(username,retrycount) {
  if (retrycount) {
    retrycount--
    setTimeout(function() {
      getUserInfo(username,function(userInfo) {
        if(userInfo.roles.indexOf("confirmed")!=-1) {
          alert("email confirmed");
          window.location.search="";
          return;
        } else if (userInfo.confirm_error) {
          alert("confirmation failed : "+userInfo.confirm_error);
          window.location.search="";
          return;
        } else {
          waitConfirm(username,retrycount);
        }
      },function(error) {
        if (retrycount) {
          retrycount--;
          waitConfirm(username,retrycount);
        } else {
          alert("confirmation failed : timeout");
          window.location.search="";
          return;
        }
      });
    },1000);
  } else {
    alert("confirmation failed : timeout");
    window.location.search="";
    return;
  }
}

function emailConfirm(username,confirm_key,retrycount) {
  getUserInfo(username,function(userInfo) {
    if(userInfo.roles.indexOf("confirmed")!=-1) {
      alert("email already confirmed");
      window.location.search="";
      return;
    }
    userInfo.confirm_key=confirm_key;
    $.couch.db("_users").saveDoc(userInfo,{
      success:function() {
        waitConfirm(username,5);
      },
      error:function(error) {
        alert("error confirming "+error);
      }
    });
  },function(error) {
    alert("error confirming "+error);
  });
}

function loginForm(callback) {
  var form=$("<form>").addClass("login");
  var username=$("<input>").addClass("username").attr("placeholder",Traduxio.getTranslated("i_username"));
  var password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password"));
  var go=$("<input>").addClass("go").attr("type","submit").val(Traduxio.getTranslated("i_login"));
  var signup=$("<span>").addClass("info signup click-enabled").text(Traduxio.getTranslated("i_signup"));
  var forgot=$("<span>").addClass("info forgot click-enabled").text(Traduxio.getTranslated("i_password_forgot"));
  form.append(username).append(password).append(go).append(signup).append(forgot).on("submit",function(e) {
    e.preventDefault();
    var name=fixUsername(username.val());
    var passwd=password.val();
    if (name && passwd)
      login(name,passwd).fail(function() {
        username.add(password).addClass("bad");
      });
    else username.add(password).addClass("bad");
  });
  signup.on("click",function() {
    callback();
    var modal=addModal(signUpForm(function() {
      modal.remove();
    }),getTranslated("i_signup"));
  });
  forgot.on("click",function() {
    callback();
    var modal=addModal(forgotForm(function() {
      modal.remove();
    }),getTranslated("i_password_forgot"));
  });
  return form;
}

function editUserForm(userInfo,callback) {
  var form=$("<form>").addClass("user-info");
  var username=$("<input>").addClass("username").attr("disabled","disabled").attr("placeholder",Traduxio.getTranslated("i_username")).val(userInfo.name);
  var fullname=$("<input>").addClass("fullname").attr("placeholder",Traduxio.getTranslated("i_fullname")).val(userInfo.fullname);
  var email=$("<input>").addClass("email").attr("placeholder",Traduxio.getTranslated("i_email")).val(userInfo.email);
  var password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password"));
  var confirm_password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password_confirm"));
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
    if (userInfo.forcedPassword && !password.val()) {
      password.addClass("bad");
      confirm_password.addClass("bad");
      bad=true;
    }
    if (bad) return;
    if (password.val()) {
      userInfo.password=password.val();
      delete userInfo.forcedPassword;
    }
    userInfo.email=email.val();
    userInfo.fullname=fullname.val();
    if (userInfo.roles.indexOf("confirmed")==-1 && userInfo.confirm_sent_timestamp) {
      delete userInfo.confirm_sent_timestamp;
    }
    $.couch.db("_users").saveDoc(userInfo,{success:function() {
      if (password.val()) {
        //need to log the user again
        login(userInfo.name,userInfo.password).done(callback);
      } else {
        callback();
      }
    }});
  });
  if (userInfo.forcedPassword) {
    var changePassword=$("<div>").insertAfter(password).append(
      $("<span>").addClass("info").text("Please change your password")
    );
    password.addClass("bad");
  }
  var div=$("<div>").insertAfter(email);
  if (userInfo.roles.indexOf("confirmed")==-1) {
    var unconfirmed=$("<span>").addClass("info").text(getTranslated("i_email_not_confirmed")).appendTo(div);
    var status=$("<span>").addClass("info").appendTo(div);
    if (userInfo.confirm_error) {
      status.text(userInfo.confirm_error);
    } else {
      if (userInfo.confirm_sent_timestamp) {
        status.text(getTranslated("i_confirmation_sent"));
      }
    }
    var resendConfirmation=$("<span>").addClass("info click-enabled").text(getTranslated("i_confirmation_resend")).appendTo(div)
    .on("click",function() {
      delete userInfo.confirm_sent_timestamp;
      status.text(getTranslated("i_confirmation_sending"));
      $.couch.db("_users").saveDoc(userInfo,{
        success:function() {
          function waitSent(tries) {
            getUserInfo(userInfo.name,function(userInfo) {
              if (userInfo.confirm_error) {
                status.text(userInfo.confirm_error);
              }
              if (userInfo.confirm_sent_timestamp) {
                status.text(getTranslated("i_confirmation_sent"));
                resendConfirmation.remove();
              } else {
                if (tries) {
                  tries--;
                  setTimeout(waitSent,1000,tries);
                } else {
                  status.text("error");
                }
              }
            });
          }
          waitSent(5);
        },
        error:function() {
          status.text("error");
        }
      });
    });
  } else {
    var confirmed=$("<span>").addClass("info").text(getTranslated("i_email_confirmed")).appendTo(div);
  }
  return form;
}

function isValidEmail(email) {
  var emailRegExp=/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegExp.test(email);
}

function waitForRequest(id,tries,callback) {
  $.ajax({
    url:getPrefix()+"/password_request/"+id,
    dataType:"json"
  }).success(function(result) {
    callback();
  }).error(function() {
    tries--;
    if (tries) {
      setTimeout(waitForRequest,500,id,tries,callback);
    } else {
      alert("error while managing request");
      callback();
    }
  });
}

function forgotForm(callback) {
  var form=$("<form>").addClass("forgot-password");
  var emailInput=$("<input>").addClass("email").attr("placeholder",Traduxio.getTranslated("i_email"));
  var go=$("<input>").addClass("go").attr("type","submit").val(Traduxio.getTranslated("i_password_reset"));
  form.append(emailInput).append(go).on("submit",function(e) {
    e.preventDefault();
    var email=emailInput.val();
    if (!isValidEmail(email)) {
      emailInput.addClass("bad");
      return;
    }
    $.ajax({
      url:getPrefix()+"/password_request",
      method:"PUT",
      data:JSON.stringify({email:email}),
      contentType:"application/json",
      dataType:"json"
    }).success(function(result) {
      waitForRequest(result.id,10,callback);
    }).error(function() {
      alert("error while sending request");
    });
  });
  return form;
}

function signUpForm(callback) {
  var form=$("<form>").addClass("user-info");
  var username=$("<input>").addClass("username").attr("placeholder",Traduxio.getTranslated("i_username"));
  var fullname=$("<input>").addClass("fullname").attr("placeholder",Traduxio.getTranslated("i_fullname"));
  var email=$("<input>").addClass("email").attr("placeholder",Traduxio.getTranslated("i_email"));
  var password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password"));
  var confirm_password=$("<input>").addClass("password").attr("type","password").attr("placeholder",Traduxio.getTranslated("i_password_confirm"));
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
    var fixedUsername=fixUsername(username.val())
    if (!fixedUsername || fixedUsername!==username.val()) {
      if (fixedUsername) username.val(fixedUsername);
      username.addClass("bad");
      bad=true;
    }
    if (bad) return;
    var data={
      name:fixedUsername,
      email:email.val(),
      fullname:fullname.val().trim()
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
        var modal=addModal(loginForm(function() {
          modal.remove();
        }),"Please log in to confirm your email");
      } else {
        emailConfirm(result.userCtx.name,getParameterByName("email_confirm"));
      }
    } else if (result.userCtx.name) {
      getUserInfo(result.userCtx.name,function(userInfo) {
        if (userInfo.forcedPassword) {
          var modal=addModal(editUserForm(userInfo,function() {
            modal.remove();
          }),"Please change your password");
        }
      });
    }
  });
});
