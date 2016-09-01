/*jshint esversion: 6 */

var WebSocketClient = require('websocket').client;
var request = require('request');
var merge = require('merge');
var Enum = require('enum');
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
        retryConnectionTime: 500  
    },
    retryMessageTime: 1000
};

const ConnectionState = new Enum(['WaitingLogin', 'LoggedIn', 'WaitingTimeout', 
    'NotConnected', 'CantLogin']);
const WebsocketState = new Enum(['Disabled', 'WaitingTimeout', 'WaitingResponse', 'Connected',
                'NotConnected', 'FirstTry']);

function Homecloud(options) {
    //Set internal variables
    this._options = merge.recursive(DEFAULT_OPTIONS, options);
    this._connectionState = ConnectionState.NotConnected;
    if (this._options.websocket.address)
        this._websocketState = WebsocketState.FirstTry;
    else
        this._websocketState = WebsocketState.Disabled;
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
    if (this._connectionState != ConnectionState.NotConnected)
        return;
    this._connectionState = ConnectionState.WaitingLogin;
    console.log("[LOGIN] Sending login message");
    this._sendHttpMessage({
        function: "login",
        username: this._options.username,
        password: this._options.password,
    }, (data, response) => {
        if (data.status !== 200) {
            console.log("[LOGIN] Login error: '" +
                (data.errorMessage ? data.errorMessage : '') + "' (status " + data.status + ")");
            this._connectionState = ConnectionState.CantLogin;
        }
        else {
            console.log("[LOGIN] Logged in");
            this._connectionState = ConnectionState.LoggedIn;
            //Send stored messages
            this._sendStoredMessages();
            //Connect websocket
            this._connectWebSocket();
        }
    }, (err, response) => {
        this._connectionState = ConnectionState.WaitingTimeout;
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
        //Will try again
        console.log("[LOGIN] Will retry in " + this._options.retryMessageTime + "ms");
        setTimeout(() => {
            this._connectionState = ConnectionState.NotConnected;
            this._login();
        }, this._options.retryMessageTime);
    });
};

Homecloud.prototype._connectWebSocket = function () {
    //Don't try to connect if client doesn't want
    //websocket or is connected or is not logged in or is waiting socket response
    if (this._websocketState != WebsocketState.NotConnected &&
        this._websocketState != WebsocketState.FirstTry) {    
        //Tried to connect when disabled
        //Or when is waitinig for response or waiting timeout
        return;
    }

    if (this._connectionState != ConnectionState.LoggedIn) {
        //Trying to connect websocket without login
        //Won't set timeout, it will retry when logged in
        return;
    }

    if (this._websocketState == WebsocketState.FirstTry) {
        //Reconnect function
        var reconnect = () => {
            this._websocketState = WebsocketState.WaitingTimeout;
            setTimeout(() => {
                this._websocketState = WebsocketState.NotConnected;
                this._connectWebSocket();
            }, this._options.websocket.retryConnectionTime);
        };

        this._websocketState = WebsocketState.NotConnected;
        //Configure webscoket
        this._websocket = new WebSocketClient({});
        this._websocket.on('connectFailed', (error) => {
            console.log('[WEBSOCKET CONN] Error in connection: ');
            console.log(error);
            console.log('[WEBSOCKET CONN] Will retry connection in ' +
                this._options.websocket.retryConnectionTime + "ms");
            //Try to reconnect
            reconnect();

        });
        this._websocket.on('connect', (connection) => {
            //Conected!
            console.log('[WEBSOCKET CONN] Connected!');
            this._websocketState = WebsocketState.Connected;
            
            connection.on('error', (error) => {
                console.log("[WEBSOCKET CONN] Connection Error: ");
                console.log(error);
                reconnect();
            });
            connection.on('close', () => {
                console.log("[WEBSOCKET CONN] Connection Closed: ");
                reconnect();
            });
            connection.on('message', (message) => {
                console.log("[WEBSOCKET CONN] Got Message");
                console.log(message);
            });
        });
    }
    this._websocketState = WebsocketState.WaitingResponse;
    this._websocket.connect(this._options.websocket.address, null, null, 
        { Cookie: "ring-session=1e69aafd-5710-4282-9e03-443359a14dc5" });
};

//Send message using user login
Homecloud.prototype._sendMessage = function () {

};

Homecloud.prototype._sendStoredMessages = function () {

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