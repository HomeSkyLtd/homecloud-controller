/*jshint esversion: 6 */

var testServer = require('./test_server');


testServer.createServer(() => {}, () => {
    testServer.sendNotification({
        notification: "newAction"
    });
});