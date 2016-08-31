/*jshint esversion: 6 */

var WebSocketClient = require('websocket').client;
var request = require('request');
var merge = require('merge');

/*
    options is in the format:
    {
        username: "login",
        password: "password",
        websocket: {
            retryConnectionTime: TIME,
            address: ADDRESS   
        },
        address: ADDRESS,
        retryMessageTime: TIME
    }
*/

const DEFAULT_OPTIONS = {
    websocket: {
        retryConnectionTime: 5000  
    },
    retryMessageTime: 5000
};

function Homecloud(options) {
    //Set internal variables
    this._options = merge.recursive(DEFAULT_OPTIONS, options);
    this._connected = false;
    this._webSocketConnected = false;
    this._webSocketTimer = false;
    this._msgQueue = [];
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

    //Connect
    this._login();
}


Homecloud.prototype._sendHttpMessage = function(msg, onSend, onError) {
    request.post(this._options.address, { form: { payload: JSON.stringify(msg) } },
        (err, response, body) => {
            if (err) {
                console.log("[Homecloud] Error sending message: ");
                console.log(err);
                this._msgQueue.push({message: msg, callback: onSend});
                onError(err);
            }
            else {
                if (response.statusCode !== 200) {
                    console.log("[Homecloud] Non 200 status: " + response.statusCode );
                    this._msgQueue.push({message: msg, callback: onSend});
                    onError(null, response);
                }
                else {
                    var data = JSON.parse(body);
                    console.log("[Homecloud] Sent message");
                    if (onSend)
                        onSend(data, response);
                }
            }
        });
};

Homecloud.prototype._login = function() {
    console.log("[LOGIN] Sending login message");
    this._sendHttpMessage({
        function: "login",
        username: this._options.username,
        password: this._options.password,
    }, (data, response) => {
        if (data.status !== 200) {
            console.log("[LOGIN] Login error: '" +
                data.errorMessage + "' (status " + data.status + ")");
        }
        else {
            console.log("[LOGIN] Logged in");
            this._connected = true;
            //Send stored messages
            this._sendStoredMessages();
            //Connect websocket
            this._connectWebSocket();
        }
    }, (err, response) => {
        if (err !== null) {
            //Connection error: try later
            //Maybe there is no internet
            console.log("[LOGIN] Couldn't connect to server");
        }
        else if (response.statusCode !== 200) {
            //Server answered but there is some error
            //Like 500 or 404
            console.log("[LOGIN] Couldn't login: Got status " + response.statusCode);
        }
        console.log("[LOGIN] Will retry in " + this._options.retryMessageTime + "ms");
        setTimeout(this._login, this._options.retryMessageTime);
    });
};

//Send message using user login
Homecloud.prototype._sendMessage = function () {

};

Homecloud.prototype._sendStoredMessages = function () {

};

Homecloud.prototype._connectWebSocket = function () {
    //Don't try to connect if client doesn't want
    //websocket or is connected or is not logged in or is waiting socket response
    if (!this._options.websocket.address || 
        !this._connected || this._webSocketConnected ||
        this._webSocketWaiting)
        return;

    if (this._triedWebSocketConnection && this._options.websocket.address) {
        this._triedWebSocketConnection = true;
        //Configure webscoket
        this._websocket = new WebSocketClient({});
        websocket.on('connectFailed', function(error) {
            console.log('[WEBSOCKET CONN] Error: ');
            console.log(error);
            this._webSocketConnected = false;
            this._webSocketTimer = true;
            this._webSocketWaiting = false;
            setTimeout(this._connect, this._options.retryWebSocketTime);
        });
        websocket.on('connect', function(connection) {
            //Conected!
            this._webSocketConnected = true;
            this._webSocketWaiting = false;
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
    }
    //Ended timer
    this._webSocketTimer = false;
    //Websocket is waiting
    this._webSocketWaiting = true;
    websocket.connect(this._options.websocket.address, null, null, 
        { Cookie: "ring-session=1e69aafd-5710-4282-9e03-443359a14dc5" });
};



Homecloud.prototype.newData = function (dataArray, onSend) {
	sendHttpMessage(this._httpServer, {
			function: "newData",
			data: dataArray
		}, onSend, this);
    return this;
};

Homecloud.prototype.newCommand = function (commandArray, onSend) {
	sendHttpMessage(this._httpServer, {
			function: "newCommand",
			command: commandArray
		}, onSend, this);
    return this;
};

Homecloud.prototype.onAction = function(callback) {
    this._notifications.newAction.cb = callback;
    return this;
};

Homecloud.prototype.onRules = function(callback) {
    return this;
};

exports.Homecloud = Homecloud;