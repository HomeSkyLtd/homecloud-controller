/*jshint esversion: 6 */

var WebSocketClient = require('websocket').client;
var request = require('request');

function Homecloud(httpServer, webSocketServer) {
	this._websocket = new WebSocketClient({});
    connect(this._websocket, webSocketServer);
	//this._websocket.connect(webSocketServer);
	this._msgQueue = [];
	this._httpServer = httpServer;
    this._notifications = {
        newAction: {
            cb: null,
            receiver: (message) => {
                if (cb)
                    cb(message.nodeId, message.commandId, message.value);
            }
        },
        newRules: function() {},
        acceptedNode: function() {},
        removedNode: function() {},
    };
}

function connect(websocket, address) {
    websocket.on('connectFailed', function(error) {
        console.log('Connect Error: ');
        console.log(error);
    });
    websocket.on('connectFailed', function(error) {
        console.log('Connect Error: ');
        console.log(error);
    });
     
    websocket.on('connect', function(connection) {
        console.log('WebSocket Client Connected');
        connection.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', function() {
            console.log('echo-protocol Connection Closed');
        });
        connection.on('message', function(message) {
            console.log("RECEIVED MESSAGE");
            console.log(message);
        });
    });

    websocket.connect(address, null, null, 
        { Cookie: "ring-session=1e69aafd-5710-4282-9e03-443359a14dc5" });
}


function sendHttpMessage(to, msg, onSend, obj) {
	request.post(to, { form: { payload: JSON.stringify(msg) } },
		function (err, response, body) {
            if (err) {
                console.log("[Homecloud] Error sending message: ");
                console.log(err);
                obj._msgQueue.push({message: msg, callback: onSend});
            }
            else {
                if (response.statusCode !== 200) {
                    console.log("[Homecloud] Non 200 status: " + response.statusCode );
                    obj._msgQueue.push({message: msg, callback: onSend});
                    return;
                }
                var res = JSON.parse(body);
                console.log("[Homecloud] Sent message");
    			if (onSend)
    				onSend(res);
            }
		});
}

Homecloud.prototype.newData = function (dataArray, onSend) {
	sendHttpMessage(this._httpServer, {
			function: "newData",
			data: dataArray
		}, onSend, this);
};

Homecloud.prototype.newCommand = function (commandArray, onSend) {
	sendHttpMessage(this._httpServer, {
			function: "newCommand",
			command: commandArray
		}, onSend, this);
};

Homecloud.prototype.onAction = function(callback) {
    this._notifications.newAction.cb = callback;
};

Homecloud.prototype.onRules = function(callback) {

};

exports.Homecloud = Homecloud;