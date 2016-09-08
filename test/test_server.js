/*jshint esversion: 6 */

/*
    Test server that echoes the message
*/

var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
 

var WEBSOCKET_PORT = 8092;
var HTTP_PORT = 8093;

var websocketConnection;
var websocketHttpServer;
var webSocketServer;

function createWebSocketServer(callback, onConnect) {
    websocketHttpServer = http.createServer(function(request, response) {
        response.writeHead(404);
        response.end();
    });

    websocketHttpServer.listen(WEBSOCKET_PORT, function() {
        console.log('[WEBSOCKET SERVER] Listening on port ' + WEBSOCKET_PORT);
        callback();
    });
     
    webSocketServer = new WebSocketServer({
        httpServer: websocketHttpServer,
        // You should not use autoAcceptConnections for production 
        // applications, as it defeats all standard cross-origin protection 
        // facilities built into the protocol and the browser.  You should 
        // *always* verify the connection's origin and decide whether or not 
        // to accept it. 
        autoAcceptConnections: false
    });
     
     
    webSocketServer.on('request', function(request) {
        if (request.httpRequest.headers.cookie !== 'ring-session=1e69aafd-5710-4282-9e03-443359a14dc5') {
            console.log('[WEBSOCKET SERVER] Rejected connection');
            request.reject();
            return;
        }
        websocketConnection = request.accept();
        console.log('[WEBSOCKET SERVER] Accepted connection');
        websocketConnection.on('message', function(message) {
            console.log("Server received message");
            console.log(message);
        });

        websocketConnection.on('close', function(reasonCode, description) {
            console.log('[WEBSOCKET SERVER] Closed connection');
        });
        if (onConnect)
            onConnect();
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

            if (val.function === 'newDetectedNodes' ||
                val.function === 'newData' ||
                val.function === 'newCommand' ||
                val.function === 'setNodeState' ||
                val.function === 'actionResult') {

                res.json({status: 200, echo: val});
            }
            else if (val.function === 'getRules') {
                res.json({status: 200, echo: val, rules: [{
                    nodeId: 1,
                    controllerId: 1,
                    commandId: 1,
                    value: 1,
                    clauses: []
                },
                {
                    nodeId: 2,
                    controllerId: 1,
                    commandId: 3,
                    value: 0,
                    clauses: []
                }
                ]});
            }
            else {
                res.json({status: 400, errorMessage: 'Invalid function'});
            }            
        }
    }  
});


var httpServer;
exports.createServer = function(callback, onConnect) {
    httpServer = app.listen(HTTP_PORT, function () {
        console.log('[HTTP SERVER] Listening on port ' + HTTP_PORT);
        createWebSocketServer(callback, onConnect);
    });
};

exports.stopHttpServer = function () {
    httpServer.close();
};

exports.restartHttpServer = function () {
    httpServer = app.listen(HTTP_PORT, function () {
        console.log('[HTTP SERVER] Listening on port ' + HTTP_PORT);
    });
};

exports.stopWebsocket = function () {
    webSocketServer.shutDown();
    websocketHttpServer.close();
};

exports.restartWebsocket = function (callback) {
    createWebSocketServer(() => {}, callback);
};

exports.sendNotification = function(notification) {
    websocketConnection.sendUTF(JSON.stringify(notification));
};

exports.closeServer = function(callback) {
    httpServer.close();
    webSocketServer.shutDown();
    websocketHttpServer.close();
};