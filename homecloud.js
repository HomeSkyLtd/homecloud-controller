/*jshint esversion: 6 */

var WebSocketClient = require('websocket').client;
var request = require('request');

function Homecloud(httpServer, webSocketServer) {
	this._websocket = new WebSocketClient({});
	//this._websocket.connect(webSocketServer);
	this._msgQueue = [];
	this._httpServer = httpServer;
}


function sendHttpMessage(to, msg, onSend) {
	request.post(to, { form: { payload: JSON.stringify(msg) } },
		function (err, response, body) {
			console.log(err);
			console.log("Sent! Status: " + response.statusCode);
			if (onSend)
				onSend();
		});
}

Homecloud.prototype.newData = function (dataArray, onSend) {
	sendHttpMessage(this._httpServer, {
			function: "newData",
			data: dataArray
		}, onSend);
};

Homecloud.prototype.newCommand = function (commandArray, onSend) {
	sendHttpMessage(this._httpServer, {
			function: "newCommand",
			command: commandArray
		}, onSend);
};

exports.Homecloud = Homecloud;