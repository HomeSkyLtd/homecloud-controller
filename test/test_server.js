var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
 

var WEBSOCKET_PORT = 8092;
var HTTP_PORT = 8093;


function createWebSocketServer() {
    var server = http.createServer(function(request, response) {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
    });

    server.listen(WEBSOCKET_PORT, function() {
        console.log((new Date()) + ' Websocket Server is listening on port ' + WEBSOCKET_PORT);
    });
     
    wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production 
        // applications, as it defeats all standard cross-origin protection 
        // facilities built into the protocol and the browser.  You should 
        // *always* verify the connection's origin and decide whether or not 
        // to accept it. 
        autoAcceptConnections: true
    });
     
     
    wsServer.on('request', function(request) {
        var connection = request.accept();
        console.log((new Date()) + ' Connection accepted.');
        connection.on('message', function(message) {
            console.log("Server received message");
            console.log(message);
        });
        connection.sendUTF(JSON.stringify({notification: "newAction"}));
        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
    });

}


app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true }));


app.post('/', function (req, res) {
    console.log("[HTTP SERVER] Received message: " + req.body.payload);
    var val = JSON.parse(req.body.payload);
    res.json({status: 404});
});



exports.createServer = function(callback) {
    app.listen(HTTP_PORT, function () {
        console.log('[HTTP SERVER] Listening on port ' + HTTP_PORT);
        callback();
    });
};