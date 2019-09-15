// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');

const app = express();

// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/c6f95639.ngrok.io/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/c6f95639.ngrok.io/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/c6f95639.ngrok.io/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.use((req, res) => {
	res.send('Hello there !');
});

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

//httpServer.listen(8080, () => {
//	console.log('HTTP Server running on port 80');
//});

httpsServer.listen(1338, () => {
	console.log('HTTPS Server running on port 443');
});
