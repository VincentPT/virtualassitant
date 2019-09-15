$(document).ready(function() {
  $.ajaxSetup({ cache: true });
  $.getScript('https://connect.facebook.net/en_US/sdk.js', function(){
    FB.init({
      appId: '518142272016945',
      version: 'v3.2'
    });     
    $('#loginbutton,#feedbutton').removeAttr('disabled');
    FB.getLoginStatus(updateStatusCallback);
  });
});

let onConnectingOperation = false;

function requestLinkPageToBot(authResponse) {
    if(onConnectingOperation) return;
    onConnectingOperation = true;
    
    //let Url = window.location.protocol + '//' + window.location.hostname + '/bot';
    let Url = window.location.origin + '/bot';    
    let accessToken = authResponse.accessToken;
    let data = {
        userID : authResponse.userID,
        userAccessToken : accessToken
    };
    $.ajax({
        type: 'POST',
        url: Url,
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function (result) {
            let response = JSON.parse(result);
            console.log(result);
            showStatus('connect page success');
            onConnectingOperation = false;
        },
        error: function (errMsg) {
            showStatus(errMsg);
            onConnectingOperation = false;
        }
    });
}

function requesDisconnectFromBot(authResponse) {
    if(onConnectingOperation) return;
    onConnectingOperation = true;
    
    let Url = window.location.origin + '/bot';    
    let accessToken = authResponse.accessToken;
    $.ajax({
        type: 'DELETE',
        url: Url + '?' + $.param({'userAccessToken': accessToken}),
        success: function (result) {
            let response = JSON.parse(result);
            console.log(result);
            
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    showStatus('disconnect from the bot but there is something wrong, try refresh the page');
                }
                else {
                    showStatus('disconnect from the bot success');
                }
                onConnectingOperation = false;
            }, true);
        },
        error: function (errMsg) {
            showStatus('disconnect from the bot failed: ' + errMsg);
            onConnectingOperation = false;
        }
    });
}

function disconnectToBot() {
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            // The user is logged in and has authenticated your
            // app, and response.authResponse supplies
            // the user's ID, a valid access token, a signed
            // request, and the time the access token 
            // and signed request each expire.
            let authResponse = response.authResponse;
            requesDisconnectFromBot(authResponse);
        }
        else if (response.status === 'authorization_expired') {
            // The user has signed into your application with
            // Facebook Login but must go through the login flow
            // again to renew data authorization. You might remind
            // the user they've used Facebook, or hide other options
            // to avoid duplicate account creation, but you should
            // collect a user gesture (e.g. click/touch) to launch the
            // login dialog so popup blocking is not triggered.
            showStatus('your session is expired, you must loggin again');
            showLogin();
        } else if (response.status === 'not_authorized') {
            // The user hasn't authorized your application.  They
            // must click the Login button, or you must call FB.login
            // in response to a user gesture, to launch a login dialog./
            showStatus('you are not connected to the bot');
        }
        else {
            showStatus('you are not loggin');
            showLogin();
        }
    });
}

function showStatus(text) {
    document.getElementById('linkPageToBotStatus').textContent = text;
}

function showLogin() {
    FB.login(function(response) {
        if (response.authResponse) {
         //let authResponse = FB.getAuthResponse();
         let authResponse = response.authResponse;
         requestLinkPageToBot(authResponse);
        } else {
         console.log('User cancelled login or did not fully authorize.');
         showStatus('Fail to authenticate');
        }
    },
    {
        scope: 'manage_pages,pages_messaging',
        auth_type: 'rerequest'
    });
}

function updateStatusCallback(response) {
    if (response.status === 'connected' || response.status === 'authorization_expired' || response.status === 'not_authorized') {
      let authResponse = response.authResponse;
      
    console.log(response.status);
    if(authResponse) {
        let userID = authResponse.userID;
        FB.api(
            `/${userID}/`,
            function (response) {
              if (response && !response.error) {
                 showStatus(`logged-in user: ${response.name}`);
              }
            }
        );
    }
  } else {
    showStatus('You are not logged-in to facebook');
  }
}

function linkPageToBot() {
    //console.log('linkPageToBot is called');
  FB.getLoginStatus(function(response) {
  if (response.status === 'connected') {
    // The user is logged in and has authenticated your
    // app, and response.authResponse supplies
    // the user's ID, a valid access token, a signed
    // request, and the time the access token 
    // and signed request each expire.
    let authResponse = response.authResponse;
    requestLinkPageToBot(authResponse);
  }
  //else {
  //  FB.login(function(response) {
  //     if (response.authResponse) {
  //       let authResponse =   FB.getAuthResponse();
  //       console.log(response);            
  //     } else {
  //       console.log('User cancelled login or did not fully authorize.');
  //     }
  //   }, {scope: 'manage_pages,pages_messaging'});
  //}
  else if (response.status === 'authorization_expired') {
    // The user has signed into your application with
    // Facebook Login but must go through the login flow
    // again to renew data authorization. You might remind
    // the user they've used Facebook, or hide other options
    // to avoid duplicate account creation, but you should
    // collect a user gesture (e.g. click/touch) to launch the
    // login dialog so popup blocking is not triggered.
    showLogin();
  } else if (response.status === 'not_authorized') {
    // The user hasn't authorized your application.  They
    // must click the Login button, or you must call FB.login
    // in response to a user gesture, to launch a login dialog./
    showLogin();
  } else {
    // The user isn't logged in to Facebook. You can launch a
    // login dialog with a user gesture, but the user may have
    // to log in to Facebook before authorizing your application./
    showLogin();
  }
 });
}