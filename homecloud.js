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

/* Default options of the constructor */
const DEFAULT_OPTIONS = {
    websocket: {
        retryConnectionTime: 5000  
    },
    retryMessageTime: 5000
};

/* Enum of the state of the connection with the server */
const ConnectionState = new Enum(['WaitingLogin', 'LoggedIn', 'WaitingTimeout', 
    'NotConnected', 'CantLogin', 'Disabled']);
/* Enum of the state of the websocket */
const WebsocketState = new Enum(['Disabled', 'WaitingTimeout', 'WaitingResponse', 'Connected',
                'NotConnected', 'FirstTry']);


/**
    @class
    @param {Object} options - Server and controller configurations
*/
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
}



/* API Functions */

/**
    Starts the client. It logins and then connects the websocket.
    Just call this function one time.
*/
Homecloud.prototype.start = function() {
    //Silent ignore wrong call
    if (this._calledStart)
        return;
    
    //Connect
    this._calledStart = true;
    this._login();
};

/**
    Notificates server of new detected nodes
    @param {Homecloud~Node[]} nodes - List containing new detected nodes
    @param {Homecloud~OnSend} [onSend] - Callback to call when the message was sent
    @param {Homecloud~OnError} [onError] - Callback to call when the server rejected the message
*/
Homecloud.prototype.newNodes = function(nodes, onSend, onError) {
    this._sendMessage({
        function: "newDetectedNodes",
        node: nodes
    }, {
        onSend: onSend,
        onError: onError
    });
    return this;
};

/**
    Notificates server of new sensor data
    @param {Homecloud~Data[]} dataArray - List containing new sensor data
    @param {Homecloud~OnSend} [onSend] - Callback to call when the message was sent
    @param {Homecloud~OnError} [onError] - Callback to call when the server rejected the message
*/
Homecloud.prototype.newData = function (dataArray, onSend, onError) {
	this._sendMessage({
		function: "newData",
		data: dataArray
	}, {
        onSend: onSend,
        onError: onError
    });
    return this;
};

/**
    Notificates server of new actuator change (external command or by rules)
    @param {Homecloud~Data[]} dataArray - List containing executed commands
    @param {Homecloud~OnSend} [onSend] - Callback to call when the message was sent
    @param {Homecloud~OnError} [onError] - Callback to call when the server rejected the message
*/
Homecloud.prototype.newCommand = function (commandArray, onSend, onError) {
	this._sendMessage({
		function: "newCommand",
		command: commandArray
	}, {
        onSend: onSend,
        onError: onError
    });
    return this;
};

/**
    Notificates server of state change in the node
    @param {number} nodeId - Id of the node
    @param {boolean} alive - Indicates if the node is alive (true) or dead (false)
    @param {Homecloud~OnSend} [onSend] - Callback to call when the message was sent
    @param {Homecloud~OnError} [onError] - Callback to call when the server rejected the message
*/
Homecloud.prototype.setNodeState = function(nodeId, alive, onSend, onError) {
    this._sendMessage({
        function: "setNodeState",
        nodeId: nodeId,
        alive: alive ? 1 : 0
    }, {
        onSend: onSend,
        onError: onError
    });
    return this;
};

/**
    Notificates server of the result of an action he asked
    @param {Homecloud~Action} action - The action executed (or not)
    @param {boolean} result - Indicates if the action was executed (true) or not (false)
    @param {Homecloud~OnSend} [onSend] - Callback to call when the message was sent
    @param {Homecloud~OnError} [onError] - Callback to call when the server rejected the message
*/
Homecloud.prototype.actionResult = function(action, result, onSend, onError) {
    this._sendMessage({
        function: "actionResult",
        result: result ? 1 : 0,
        action: action
    }, {
        onSend: onSend,
        onError: onError
    });
    return this;
};

/**
    Gets all the accepted rules in the server
    @param {Homecloud~OnSend} [onSend] - Callback to call when the message was sent, containing the rules
    @param {Homecloud~OnError} [onError] - Callback to call when the server rejected the message
*/
Homecloud.prototype.getRules = function(onSend, onError) {
    this._sendMessage({
        function: "getRules",
    }, {
        onSend: onSend,
        onError: onError
    });
    return this;
};

/**
    Defines the function to call when there is an action
    @param {Homecloud~OnNotification} callback - Callback to call when server send new action
*/
Homecloud.prototype.onAction = function(callback) {
    this._notificationHandlers.newAction = callback;
    return this;
};

/**
    Defines the function to call when there is change in rules
    @param {Homecloud~OnNotification} callback - Callback to call when there is change in rules
*/
Homecloud.prototype.onRules = function(callback) {
    this._notificationHandlers.newRules = callback;
    return this;
};

/**
    Defines the function to call when user accepted (or not) a discovered node
    @param {Homecloud~OnNotification} callback - Callback to call when a node is accepted (or not)
*/
Homecloud.prototype.onAcceptNode = function(callback) {
    this._notificationHandlers.acceptedNode = callback;
    return this;
};

/**
    Defines the function to call when a node is removed by the user
    @param {Homecloud~OnNotification} callback - Callback to call when a node is removed
*/
Homecloud.prototype.onRemoveNode = function(callback) {
    this._notificationHandlers.removedNode = callback;
    return this;
};

Homecloud.prototype.close = function() {
    if (this._websocketState === WebsocketState.Connected) {
        this._websocketConnection.close();
    }
    this._websocketState = WebsocketState.Disabled;
    this._connectionState = ConnectionState.Disabled;

};

exports.Homecloud = Homecloud;



/*
    INTERNAL FUNCTIONS
*/

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

/* Login in the server */
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
            if (this._connectionState !== ConnectionState.Disabled) {
                this._connectionState = ConnectionState.NotConnected;
                this._login();
            }
        }, this._options.retryMessageTime);
    });
};

/* Connect to the websocket of the server (if any) */
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
                if (this._websocketState !== WebsocketState.Disabled) {
                    this._websocketState = WebsocketState.NotConnected;
                    this._connectWebSocket();
                }
            }, this._options.websocket.retryConnectionTime);
        };

        this._websocketState = WebsocketState.NotConnected;
        //Configure webscoket
        this._websocket = new WebSocketClient({});
        this._websocket.on('connectFailed', (error) => {
            console.log('[WEBSOCKET CONN] Error in connection: ');
            console.log(typeof error);
            console.log(error);
            if (error.toString().indexOf('Error: Server responded with a non-101 status: 403') !== -1) {
                this._websocketState = WebsocketState.NotConnected;
                console.log("[WEBSOCKET CONN] Got 403 status. Logging again...");
                setTimeout(() => {
                    if (this._connectionState !== ConnectionState.Disabled) {
                        this._connectionState = ConnectionState.NotConnected;
                        this._login();
                    }
                }, this._options.retryMessageTime);
                return;
            }
            console.log('[WEBSOCKET CONN] Will retry connection in ' +
                this._options.websocket.retryConnectionTime + "ms");
            //Try to reconnect
            reconnect();
        

        });
        this._websocket.on('connect', (connection) => {
            //Conected!
            console.log('[WEBSOCKET CONN] Connected!');
            this._websocketState = WebsocketState.Connected;
            this._websocketConnection = connection;
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
                console.log("[WEBSOCKET CONN] Got Message: " + JSON.stringify(rawMessage));
                var message = JSON.parse(rawMessage.utf8Data);

                if (message.notification) {
                    if (this._notificationHandlers[message.notification])
                        this._notificationHandlers[message.notification](message);
                    else {
                        console.log("[WEBSOCKET MSG] Message '" + message.notification +
                            "' without callback");
                    }
                }
            });
        });
    }
    this._websocketState = WebsocketState.WaitingResponse;
    this._websocket.connect(this._options.websocket.address, null, null, 
        { Cookie: this._cookiesJar.getCookieString(this._options.address)});
};

/* Send message with queueing when needed */
Homecloud.prototype._sendMessage = function (message, events) {
    if (!events)
        events = {};
    if (this._connectionState != ConnectionState.LoggedIn) {
        //Not logged in! Store message
        this._msgQueue.push({
            message: message,
            events: events
        });
        if (events.onQueue)
            events.onQueue();
        return;
    }

    //Function to reconnect
    var reconnect = () => {
        console.log('[MESSAGE] Storing message and will login again');
        this._msgQueue.push({
            message: message,
            events: events
        });
        if (events.onQueue)
            events.onQueue();
        if (this._connectionState === ConnectionState.LoggedIn) {
            this._connectionState = ConnectionState.WaitingTimeout;
            setTimeout(() => {
                this._connectionState = ConnectionState.NotConnected;
                this._login();
            }, this._options.retryMessageTime);
        }
    };

    //Send message
    this._sendRawMessage({
        options: {
            url: this._options.address,
            jar: this._cookiesJar
        },
        body: message
    }, (data, response) => {
        if (data.status !== 200) {
            console.log("[MESSAGE] Non 200 status received (" + data.status + ") ");
            console.log(message);
            if (data.errorMessage)
                console.log("[MESSAGE] Error: " + data.errorMessage);
            if (data.status === 403 && data.errorMessage === 'User not logged in') {
                //Logout
                reconnect();
            }
            //Server got message but refused, call onError
            else if (events.onError)
                events.onError(data);
            
        }
        else {
            console.log("[MESSAGE] Sent Message");
            console.log(message);
            if (events.onSend)
                events.onSend(data);
        }
    }, (err, response) => {
        if (err !== null) {
            console.log("[MESSAGE] Couldn't connect to server");
            reconnect();
        }
        else {
            console.log("[MESSAGE] Couldn't send message: Got status " + response.statusCode);
            if (response.statusCode === 403)
                reconnect();
            else if (events.onError)
                events.onError({status: response.statusCode});
        }
    });
};

/* Send all stored messages (one after another) */
Homecloud.prototype._sendStoredMessages = function () {
    
    var msgs = this._msgQueue;
    this._msgQueue = [];
    console.log("[STORED MSGS] " + msgs.length + " message(s) to send...");

    var recursiveSend = (i) => {
        if (i >= msgs.length)
            return;
        this._sendMessage(msgs[i].message, {
            onSend: (...args) => {
                console.log(args);
                if (msgs[i].events.onSend)
                    msgs[i].events.onSend.apply(this, args);
                recursiveSend(i + 1);
            }, 
            onError: (...args) => {
                if (msgs[i].events.onError)
                    msgs[i].events.onError.apply(this, args);
                recursiveSend(i + 1);
            },
            onQueue: () => {
                //Queued message, go to the next
                recursiveSend(i + 1);
            } 
        });
    };
    recursiveSend(0);
};

/**
 * Callback used by messages to the server
 * @callback Homecloud~onSend
 * @param {Object} data - Json object containing the response from server. It contains at least a status property
 */

/**
 * Callback used by notifications from the server
 * @callback Homecloud~onNotification
 * @param {Object} data - Json object containing the notification.
 */