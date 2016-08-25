var WebSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
 

var WEBSOCKET_PORT = 8092;
var HTTP_PORT = 8093;

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
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
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



app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true }));


app.post('/', function (req, res) {
    res.json({status: 200});
});

app.listen(HTTP_PORT, function () {
    console.log((new Date()) + ' HTTP Server is listening on port ' + HTTP_PORT);
});
