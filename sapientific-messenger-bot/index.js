'use strict';

// Imports dependencies and set up http server
const
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    https = require('https'),
    mysql = require('mysql'),
    app = express().use(bodyParser.json()); // creates express http server

let rawdata = fs.readFileSync('config.json');
let config = JSON.parse(rawdata);
let VERIFY_TOKEN = config.webhookVerificationToken;
let pageAccessToken = config.messaging.pageAccessToken;
let testMessages = config.messaging.testMessages;
let testMessagesMap = new Map();

// var sqlConnection = mysql.createConnection({
  // host: config.storage.host,
  // user: config.storage.user,
  // password: config.storage.password,
  // database: config.storage.database
// });


// sqlConnection.connect(function(err) {
  // if (err) throw err;
  // console.log("mysql connection is running");
// });

var mysqlConnPool  = mysql.createPool({
  host: config.storage.host,
  user: config.storage.user,
  password: config.storage.password,
  database: config.storage.database
});

testMessages.forEach(function(textMessage){
    testMessagesMap.set(textMessage.command, textMessage.reply);
});

var httpsServer;
if(config.hasOwnProperty('ssl') && fs.existsSync(config.ssl.privateKeyPath) && fs.existsSync(config.ssl.certificatePath)) {
    let privateKey  = fs.readFileSync(config.ssl.privateKeyPath);
    let certificate = fs.readFileSync(config.ssl.certificatePath);
	let caData = fs.readFileSync(config.ssl.caPath);
    const options = {
		ca : caData,
        key: privateKey,
        cert: certificate
    };

    httpsServer = https.createServer(options, app);
    httpsServer.listen(config.port);
    console.log('webhook is listening');
}
else {
    console.log('no ssl config is available, server is running on HTTP');
    // Sets server port and logs message on success
    app.listen(config.port, () => console.log('webhook is listening'));
}

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {
    let body = req.body;
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            //    Gets the message. entry.messaging is an array, but 
            //    will only ever contain one message, so we get index 0
            let messaging = entry.messaging;
            if(messaging) {
                messaging.forEach( function(webhook_event) {
                    if(webhook_event.hasOwnProperty('message')){
                        let senderId = webhook_event.sender.id;
                        let recipientId = webhook_event.recipient.id;
                        let message = webhook_event.message.text;
                        console.log('received message \'' + message + '\' from user id = ' + senderId + ' to recipient id = ' + recipientId);

                        let autoReplyMessage = testMessagesMap.get(message);
                        if(autoReplyMessage) {
                            sendMessageToMessenger(senderId, recipientId, autoReplyMessage);
                        }
                        else {
                            sendMessageToMessenger(senderId, recipientId, 'Hello! I am a messenger bot.', () => {
                                setTimeout(() => {
                                    sendMessageToMessenger(senderId, recipientId, 'How can I help you?');
                                }, 1000);
                            });
                        }
                    }
                });
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
        
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

app.get('/', (req, res) => {
     res.status(200).send("Messenger bot server is running");
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    console.log('hub.mode = ' + mode);
    console.log('hub.verify_token = ' + token);
    console.log('hub.challenge = ' + challenge);

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

function sendMessageToMessenger (userId, recipientId, textMessage, messageSentCallback) {
    mysqlConnPool.getConnection(function(err, conn){
        console.log('sendMessageToMessenger');
        if (err)  {
            console.log('sendMessageToMessenger failed:' + err.message);
            return;
        }
        let pageId = recipientId;
        let sql = `SELECT token from pageaccesstoken where pageid='${pageId}'`;
        conn.query(sql, function (err, result, fields) {
            if (err)  {
                console.log('sendMessageToMessenger failed:' + err.message);
                conn.release();
                return;
            }
            if (result.length <= 0) {
                console.log(`Cannot find page access token for the sender id = ${pageId}`);
                conn.release();
                return;
            }
            let pageAccessToken = result[0].token;
            conn.release();

            try {
                let options = {
                    method: 'POST',
                    url:  config.graphApiBase + '/me/messages',
                    qs: { access_token: pageAccessToken },
                    headers:
                    {
                        'Cache-Control': 'no-cache',
                        'Content-Type': 'application/json'
                    },
                    body:
                    {
                        messaging_type: 'RESPONSE',
                        recipient: { id: userId },
                        message: { text: textMessage }
                    },
                    json: true
                };

                request(options, function (error, response, body) {
                    if (error) {                
                        console.log('failed to send message to user id = ' + userId + ', error:' + error.messag);
                    }
                    else {
                        console.log('sent message to user id = ' + userId);
                        if(messageSentCallback) messageSentCallback();
                    }
                });
            }
            catch (ex) {
                console.log('failed to send message to user id = ' + userId + ', error:' + error.messag);
            }
        });
    });    
}