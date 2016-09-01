/*jshint esversion: 6 */

var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
 

var WEBSOCKET_PORT = 8092;
var HTTP_PORT = 8093;


function createWebSocketServer(callback) {
    var server = http.createServer(function(request, response) {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
    });

    server.listen(WEBSOCKET_PORT, function() {
        console.log('[WEBSOCKET SERVER] Listening on port ' + WEBSOCKET_PORT);
        callback();
    });
     
    wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production 
        // applications, as it defeats all standard cross-origin protection 
        // facilities built into the protocol and the browser.  You should 
        // *always* verify the connection's origin and decide whether or not 
        // to accept it. 
        autoAcceptConnections: false
    });
     
     
    wsServer.on('request', function(request) {
        if (request.httpRequest.headers.cookie !== 'ring-session=1e69aafd-5710-4282-9e03-443359a14dc5') {
            console.log('[WEBSOCKET SERVER] Rejected connection');
            request.reject();
            return;
        }
        var connection = request.accept();
        console.log('[WEBSOCKET SERVER] Accepted connection');
        connection.on('message', function(message) {
            console.log("Server received message");
            console.log(message);
        });

        connection.sendUTF(JSON.stringify({notification: "newAction"}));
        connection.on('close', function(reasonCode, description) {
            console.log('[WEBSOCKET SERVER] Closed connection');
        });
    });

}


app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true }));
app.use(cookieParser());


app.post('/', function (req, res) {
    var ringSession = '1e69aafd-5710-4282-9e03-443359a14dc5';
    console.log("[HTTP SERVER] Received message: " + req.body.payload);
    var val = JSON.parse(req.body.payload);
    res.status(200);
    if (!val.function)
        res.json({status: 400, errorMessage: 'Invalid function'});
    else if (val.function === 'login') {
        if (val.username === "login123" && val.password === "pass123") {
            res.cookie('ring-session', '1e69aafd-5710-4282-9e03-443359a14dc5');
            res.json({status: 200});
        }
        else
            res.json({status: 400, errorMessage: 'Invalid login/password'});
    }
    else {
        //Try to get cookie
        if (req.cookies['ring-session'] !== '1e69aafd-5710-4282-9e03-443359a14dc5') {
            res.json({status: 403, errorMessage: "You can't access this"});
        }
        else {
            
            if (val.function === 'newData' || val.function === 'newCommand' ||
                val.function === 'newDetectedNodes' || val.function === 'setNodeState' ||
                val.function === 'actionResult') {
                res.json({status: 200});       
            }
            else if (val.function === 'getRules') {
                res.json({status: 200});
            }
            else {
                res.json({status: 400, errorMessage: 'Invalid function'});
            }
        }
    }  
});



exports.createServer = function(callback) {
    app.listen(HTTP_PORT, function () {
        console.log('[HTTP SERVER] Listening on port ' + HTTP_PORT);
        createWebSocketServer(callback);
    });
};