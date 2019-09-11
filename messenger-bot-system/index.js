'use strict';

// Imports dependencies and set up http server
const
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    https = require('https'),
    conf = require('./conf'),
    mysql = require('mysql'),
    app = express().use(bodyParser.json()); // creates express http server

    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });
    
    app.use(express.static('html'));
    
    //var sqlConnection = mysql.createConnection(conf.storage);    
    var mysqlConnPool  = mysql.createPool(conf.storage);
    
    //sqlConnection.connect(function(err) {
    //  if (err) throw err;
    //  console.log("mysql connection is running");
    //});

var httpsServer;
if(conf.hasOwnProperty('ssl') && fs.existsSync(conf.ssl.privateKeyPath) && fs.existsSync(conf.ssl.certificatePath)) {
    let privateKey  = fs.readFileSync(conf.ssl.privateKeyPath);
    let certificate = fs.readFileSync(conf.ssl.certificatePath);
    const options = {
        key: privateKey,
        cert: certificate
    };

    httpsServer = https.createServer(options, app);
    httpsServer.listen(conf.port);
    console.log('server is listening at port ' + conf.port);
}
else {
    console.log('no ssl conf is available, server is running on HTTP');
    // Sets server port and logs message on success
    app.listen(conf.port, () => console.log('server is listening at port ' + conf.port));
}

// Creates the endpoint for our webhook 
app.post('/bot', (req, res) => {
    console.log('serve at: POST /bot');
    let body = req.body;
    let response = {
        code : 0,
        message: 'success'
    };
    if(!body.hasOwnProperty('userAccessToken')) {
        response.code = -1;
        response.message = 'invalid request, missing field userAccessToken';
        res.status(400).send(JSON.stringify(response));
        console.log(response.message);
    }
    else {
        processAssgimentProcedure(body, (error) => {
            if(error) {
                response.code = -1;
                response.message = error;
            }
            res.status(200).send(JSON.stringify(response));
        });
    }
});

app.delete('/bot', (req, res) => {
    console.log('serve at: DELETE /bot');
    let query = req.query;
    let response = {
        code : 0,
        message: 'success'
    };
    if(!query.hasOwnProperty('userAccessToken')) {
        response.code = -1;
        response.message = 'invalid request, missing field userAccessToken';
        res.status(400).send(JSON.stringify(response));
        console.log(response.message);
    }
    else {
        let userAccessToken = query.userAccessToken;
        processDeletePermissionProcedure(userAccessToken, (error) => {
            if(error) {
                response.code = -1;
                response.message = error;
            }
            res.status(200).send(JSON.stringify(response));
        });
    }
});

// Adds support for GET requests to our webhook
app.get('/', (req, res) => {    
    res.status(200).send('bot messenger management server is running');
});

app.get('/messenger', (req, res) => {
    res.sendFile('./html/manage-bot.html', { root: __dirname });
});

function parseJson(text, errorCallback) {
    try {
        let response = JSON.parse(text);
        return response;
    }
    catch(error) {
        errorCallback(error.message);
    }
}

function processAssgimentProcedure (userInfo, callback) {
    let userAccessToken = userInfo.userAccessToken;
    let userID = userInfo.userID;
    let userName = '';
    
    // 1. exchange a long lived user access token from a short lived token
    let options = {
        method: 'GET',
        url: conf.graphApiBase + '/oauth/access_token',
        qs: {
            'grant_type': 'fb_exchange_token',
            'client_id': conf.app.id,
            'client_secret': conf.app.secretKey,
            'fb_exchange_token': userAccessToken,
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            let errorMessage = 'exchange long lived user token failed with error:' + error.message;
            console.log(errorMessage);
            callback(errorMessage);
        }
        else {
            let acesssResponse = parseJson(body, (error) => {
                let errorMessage = 'exchange long lived user token failed with error:' + body;
                console.log(errorMessage);
                callback(errorMessage);
            });
            if(!acesssResponse) {
                return;
            }
            
            if(acesssResponse.hasOwnProperty('access_token')) {
                let userLongLivedAccessToken =  acesssResponse.access_token;
                
                getUserInfo(
                userLongLivedAccessToken,
                (errorMessage, userInfo) => {
                    if(errorMessage) {
                        console.log(errorMessage);
                    }
                    if(userInfo) {
                        userName = userInfo.name;
                    }
                    // store user accessing infomation
                    storeUserAccessInfo({
                        id: userID,
                        name: userName,
                        accessToken: userLongLivedAccessToken
                    }, function(errMsg) {             
                        if(errMsg) {
                            callback(`internal server error: cannot access database ${errMsg}`);
                            return;
                        }
                        
                        // get long lived page access token from long lived user access token
                        options = {
                            method: 'GET',
                            url: conf.graphApiBase + '/me/accounts',
                            qs: { 'access_token': userLongLivedAccessToken }
                        };
                        
                        request(options, function (error, response, body) {
                            if (error) {
                                console.log('get page info failed with error:' + error.message);
                                callback('get page info failed with error:' + error.message);
                            }
                            else {
                                response = parseJson(body, (error) => {
                                    let errorMessage = 'get page info failed with error:' + error;
                                    console.log(errorMessage);
                                    callback(errorMessage);
                                });
                                if(!response) {
                                    return;
                                }
                                
                                response = JSON.parse(body);                        
                                if(response.hasOwnProperty('data')) {
                                    let data =  response.data;                                
                                    if(data.length === 0) {
                                        callback('no page to process');
                                        return;
                                    }
                                    
                                    let context = {
                                        index: -1,
                                        arr : data
                                    };
                                    
                                    let subcribeCallback = (callbackContext, errorMessage) => {
                                        if(errorMessage) {
                                            callback(errorMessage);
                                        }
                                        else {
                                            callbackContext.index = callbackContext.index + 1;
                                            if(callbackContext.index >= callbackContext.arr.length) {
                                                callback();
                                            }
                                            else {                                            
                                                let pageInfo = data[callbackContext.index];
                                                subcribeApp(pageInfo, userID, subcribeCallback, context);
                                            }
                                        }
                                    };
                                    
                                    subcribeCallback(context);
                                }
                                else {
                                    if(response.hasOwnProperty('error')) {
                                        error =  response.error;
                                        let errorMessage = 'get page info failed with error:' + error.message;
                                        console.log(errorMessage);
                                        callback(errorMessage);
                                    }
                                    else {
                                        let errorMessage = 'get page info failed with error:' + body;
                                        console.log(errorMessage);
                                        callback(errorMessage);
                                    }
                                }
                            }
                        });
                    });
                });
            }
            else {
                if(response.hasOwnProperty('error')) {
                    error =  response.error;
                    let errorMessage = 'exchange long lived user token failed with error:' + error.message;
                    console.log(errorMessage);
                    callback(errorMessage);
                }
                else {
                    let errorMessage = 'exchange long lived user token failed with error:' + body;
                    console.log(errorMessage);
                    callback(errorMessage);
                }
            }
        }
    });
}

function getUserInfo(userAccessToken, callback) {
     let options = {
        method: 'GET',
        url: conf.graphApiBase + '/me',
        qs: {
            'access_token': userAccessToken
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            let errorMessage = `get user info failed with error: ${error.message}`;
            callback(errorMessage, null);
            return;
        }
        if(response.statusCode != 200) {
            let errorMessage = `get user info failed with error: ${response.body}`;
            callback(errorMessage, null);
        }
        else {
            let userInfo = parseJson(response.body, (error) => {
                let errorMessage = 'get user info failed with error:' + error;
                callback(errorMessage, null);
            });
            if(userInfo) {
                callback(null, userInfo);
            }
        }
    });
}

function storeUserAccessInfo(accessInfo, callback) {
    mysqlConnPool.getConnection(function(err, conn){
        let userName = accessInfo.name;
        let userID = accessInfo.id;
        let token = accessInfo.accessToken;
        if(err) {
            console.log(`store access tokens of user ${userName} is failed: ${err.message}`);
            callback(err.message);
            return;
        }        
        
        let sql = `INSERT INTO useraccesstoken (userid, username, token) VALUES ('${userID}', '${userName}', '${token}')`;
        conn.query(sql, function (err, result) {
            conn.release();
            if (err) {
                console.log(`store access tokens of user ${userName} is failed: ${err.message}`);
                callback(err.message);
                return;
            }
            console.log(`access tokens of user ${userName} are imported to database`);        
            if(callback) {
                callback();
            }
        });
    });
}

function storePageAccessInfo(accessInfo, callback) {
    mysqlConnPool.getConnection(function(err, conn){
        let pageId = accessInfo.id;
        let pageName = accessInfo.name;
        let userID = accessInfo.userID;
        let token = accessInfo.accessToken;
        if(err) {
            console.log(`store access tokens of user ${userName} is failed: ${err.message}`);
            callback(err.message);
            return;
        }
        
        let sql = `INSERT INTO pageaccesstoken (pageid, pagename, userid, token) VALUES ('${pageId}', '${pageName}', '${userID}', '${token}')`;
        conn.query(sql, function (err, result) {
            conn.release();
            if (err) {
                console.log(`storeAccessInfo for page ${pageName} failed:` + err.message);
                callback(err.message);
                return;
            }
            console.log(`access tokens of page ${pageName} are imported to database`);
            if(callback) {
                callback();
            }
        });
    });
}

function subcribeApp(pageInfo, userID, callback, context) {    
    let options = {
        method: 'POST',
        url: conf.graphApiBase + '/' + pageInfo.id + '/subscribed_apps',
        headers:{ 'Content-Type': 'application/json' },
        json: { 
			'access_token': pageInfo.access_token,
			'subscribed_fields':['messages', 'messaging_postbacks']
		} 
    };
    
    request(options, function (error, response, body) {
        if(error) {
            callback(context, error.message);
        }
        else {
            if(response.statusCode != 200) {
                let message = `subscribe page '${pageInfo.name}' failed`;
                console.log(message + ': ');
                console.log(response.body);
                callback(context, message);
            }
            else {
                storePageAccessInfo({
                    id: pageInfo.id,
                    name: pageInfo.name,
                    userID : userID,
                    accessToken: pageInfo.access_token
                }, function(errMsg) {
                    if(errMsg) {
                        let message = 'internal server error: cannot access database';
                        console.log(message + ': ');
                        console.log(errMsg);
                        callback(context, message);
                    }
                    else {
                        console.log('subscribe page ' + pageInfo.name + ' success');
                        callback(context);
                    }
                });
            }
        }
    });
}

function unsubscribeAppForPage(conn, pageInfo, callback) {
    let options = {
        method: 'DELETE',
        url: `${conf.graphApiBase}/${pageInfo.pageid}/subscribed_apps`,
        qs: {
            'access_token': pageInfo.token
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            let errorMessage = `unsubscribe app for page ${pageInfo.pagename} failed: ${error.message}`;
            console.log(errorMessage);
            callback(errorMessage);
        }
        else {
            if(response.statusCode != 200) {
                let errorMessage = `unsubscribe app for page ${pageInfo.pagename} failed: ${response.body}`;
                console.log(errorMessage);
                callback(errorMessage);
            }
            else {
                console.log(`page ${pageInfo.pageid} has been unsubcribed from the app`);
                // delete corressponding record in database
                let deleteSql = `DELETE FROM pageaccesstoken WHERE pageid='${pageInfo.pageid}'`;
                conn.query(deleteSql, function (err, result) {
                    if (err) {
                        let errorMessage = `delete page ${pageInfo.pageid} failed: + ${err.message}`;
                        console.log(errorMessage);
                        callback(errorMessage);
                    }
                    else {
                        console.log(`page ${pageInfo.pageid} has been deleted in database`);
                        callback();
                    }
                });
            }
        }
    });
}

function disconnectPagesForUser(userInfo, callback) {
    mysqlConnPool.getConnection(function(err, conn){
        if(err) {
            let errorMessage = `conect to database failed: ${err.message}`;
            console.log(errorMessage);
            callback(errorMessage);
            return;
        }
        
        let userId = userInfo.id;
        let userName = userInfo.name;
        let sql = `SELECT * FROM pageaccesstoken WHERE userid='${userId}'`;
        conn.query(sql, function (err, result, fields) {
            if (err) {
                let errorMessage = `query pages for user ${userName} failed: + ${err.message}`;
                console.log(errorMessage);
                callback(errorMessage);
                conn.release();
                return;
            }

            let context = {
                index: -1,
                arr : result
            };
            
            let unsubcribeCallback = (callbackContext, errorMessage) => {
                if(errorMessage) {
                    conn.release();
                    callback(errorMessage);
                }
                else {
                    callbackContext.index = callbackContext.index + 1;
                    if(callbackContext.index >= callbackContext.arr.length) {
                        conn.release();
                        callback();
                    }
                    else {                
                        let arr = callbackContext.arr;
                        let pageInfo = arr[callbackContext.index];
                        unsubscribeAppForPage(conn, pageInfo, (error) => {
                            if(error) {
                                unsubcribeCallback(callbackContext, error);
                            }
                            else {
                                unsubcribeCallback(callbackContext);
                            }
                        });
                    }
                }
            };
            
            unsubcribeCallback(context);
        });
    });
}

function removeUserPermissions(userId, userAccessToken, callback) {
    let options = {
        method: 'DELETE',
        url: `${conf.graphApiBase}/${userId}/permissions`,
        qs: {
            'access_token': userAccessToken
        }
    };
    
    request(options, function (error, response, body) {
        if (error) {
            let errorMessage = `remove permissions for user ${userId} failed: ${error.message}`;
            console.log(errorMessage);
            callback(errorMessage);
            return;
        }
        else {
            if(response.statusCode != 200) {
                let errorMessage = `remove permissions for user ${userId} failed: ${response.body}`;
                console.log(errorMessage);
                callback(errorMessage);
                return;
            }
            else {
                console.log(`granted permissions for user ${userId} has been removed`);
                mysqlConnPool.getConnection(function(err, conn){
                    if(err) {
                        let errorMessage = `conect to database failed: ${err.message}`;
                        console.log(errorMessage);
                        callback(errorMessage);
                        return;
                    }
                    
                    let deleteSql = `DELETE FROM useraccesstoken WHERE userid='${userId}'`;
                    conn.query(deleteSql, function (err, result) {
                        conn.release();
                        if (err) {
                            let errorMessage = `delete user ${userId} failed: + ${err.message}`;
                            console.log(errorMessage);
                            callback(errorMessage);
                        }
                        else {
                            console.log(`user ${userId} has been deleted in database`);
                            callback();
                        }
                    });
                });
            }
        }
    });
}

function processDeletePermissionProcedure (userAccessToken, callback) {
    getUserInfo(userAccessToken, (errorMessage, userInfo) => {
        if(errorMessage) {
            console.log(errorMessage);
            callback(errorMessage)
            return;
        }
        
        disconnectPagesForUser(userInfo, (errorMessage) => {
            removeUserPermissions(userInfo.id, userAccessToken, callback);
        });
    });
}