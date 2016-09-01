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
        retryConnectionTime: 5000  
    },
    retryMessageTime: 1000
};

/* Enum of the state of the connection with the server */
const ConnectionState = new Enum(['WaitingLogin', 'LoggedIn', 'WaitingTimeout', 
    'NotConnected', 'CantLogin']);
/* Enum of the state of the websocket */
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
    this._notificationHandlers = {

    };

    //Connect
    this._login();
}

/* Just send a message without queueing, req contains options (with stuff like url,
jar, headers, etc and body, containing the json object to send in the payload*/
Homecloud.prototype._sendRawMessage = function(req, onSend, onError) {
    var options = merge.recursive(req.options, {form: { payload: JSON.stringify(req.body) }});
    request.post(options,
        (err, response, body) => {
            if (err) {
                onError(err);
            }
            else {
                if (response.statusCode !== 200) {
                    onError(null, response);
                }
                else {
                    var data = JSON.parse(body);
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
    this._cookiesJar = request.jar();
    //Creates cookie jar
    console.log("[LOGIN] Sending login message");
    this._sendRawMessage({
        options: {
            url: this._options.address,
            jar: this._cookiesJar
        },
        body: {
            function: "login",
            username: this._options.username,
            password: this._options.password
        }
    }, (data, response) => {
        //console.log(data);
        //console.log(response);
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
            connection.on('message', (rawMessage) => {
                console.log("[WEBSOCKET CONN] Got Message");
                var message = JSON.parse(rawMessage.utf8Data);
                if (message.notification)
                    this._notificationHandlers[message.notification](message);
            });
        });
    }
    this._websocketState = WebsocketState.WaitingResponse;
    this._websocket.connect(this._options.websocket.address, null, null, 
        { Cookie: this._cookiesJar.getCookieString(this._options.address)});
};

//Send message using user login
Homecloud.prototype._sendMessage = function (message, onSend, onError) {
    if (this._connectionState != ConnectionState.LoggedIn) {
        //Not logged in! Store message
        this._msgQueue.push({
            message: message,
            onSend: onSend,
            onError: onError
        });
        return;
    }

    var reconnect = () => {
        console.log('[MESSAGE] Storing message and will login again');
        this._msgQueue.push({
                    message: message,
                    onSend: onSend,
                    onError: onError
        });
        if (this._connectionState === ConnectionState.LoggedIn) {
            this._connectionState = ConnectionState.WaitingTimeout;
            setTimeout(() => {
                this._connectionState = ConnectionState.NotConnected;
                this._login();
            }, this._options.retryMessageTime);
        }
    };

    this._sendRawMessage({
        options: {
            url: this._options.address,
            jar: this._cookiesJar
        },
        body: message
    }, (data, response) => {
        if (data.status !== 200) {
            console.log("[MESSAGE] Non 200 status (" + data.status + ") ");
            if (data.status === 403) {
                //No access, possibly logout
                reconnect();
            }
            //Server got message but refused, call onError
            else if (onError)
                onError(data);
        }
        else {
            console.log("[MESSAGE] Sent Message");
            if (onSend)
                onSend(data);
        }
    }, (err, response) => {
        if (err !== null) {
            console.log("[MESSAGE] Couldn't connect to server");
            reconnect();
        }
        else if (response.statusCode !== 200) {
            console.log("[MESSAGE] Couldn't send message: Got status " + response.statusCode);
            if (response.statusCode === 403)
                reconnect();
            else if (onError)
                onError({status: response.statusCode});

        }
    });
};

Homecloud.prototype._sendStoredMessages = function () {
    
    var msgs = this._msgQueue;
    this._msgQueue = [];
    console.log("[STORED MSGS] " + msgs.length + " message(s) to send...");

    var recursiveSend = (i) => {
        if (i >= msgs.length)
            return;
        this._sendMessage(msgs[i].message, (args) => {
            if (msgs[i].onSend)
                msgs[i].onSend.apply(this, arguments);
            recursiveSend(i + 1);
        }, (args) => {
            if (msgs[i].onError)
                msgs[i].onError.apply(this, arguments);
            recursiveSend(i + 1);
        });
    };
    recursiveSend(0);
};

Homecloud.prototype.newNodes = function(nodes, onSend, onError) {
    this._sendMessage({
        function: "newDetectedNodes",
        node: nodes
    }, onSend, onError);
    return this;
};

Homecloud.prototype.newData = function (dataArray, onSend, onError) {
	this._sendMessage({
			function: "newData",
			data: dataArray
		}, onSend, onError);
    return this;
};

Homecloud.prototype.newCommand = function (commandArray, onSend, onError) {
	this._sendMessage({
			function: "newCommand",
			command: commandArray
		}, onSend, onError);
    return this;
};

Homecloud.prototype.setNodeState = function(nodeId, alive, onSend, onError) {
    this._sendMessage({
        function: "setNodeState",
        nodeId: nodeId,
        alive: alive
    }, onSend, onError);
    return this;
};

Homecloud.prototype.actionResult = function(action, result, onSend, onError) {
    this._sendMessage({
        function: "actionResult",
        result: result,
        action: action
    }, onSend, onError);
    return this;
};

Homecloud.prototype.getRules = function(onSend, onError) {
    this._sendMessage({
        function: "getRules",
    }, onSend, onError);
    return this;
};

Homecloud.prototype.onAction = function(callback) {
    this._notificationHandlers.newAction = callback;
    return this;
};

Homecloud.prototype.onRules = function(callback) {
    this._notificationHandlers.newRules = callback;
    return this;
};

Homecloud.prototype.onAcceptNode = function(callback) {
    this._notificationHandlers.acceptedNode = callback;
    return this;
};

Homecloud.prototype.onRemoveNode = function(callback) {
    this._notificationHandlers.removedNode = callback;
    return this;
};

Homecloud.prototype.close = function() {
    //TODO: close
};

exports.Homecloud = Homecloud;