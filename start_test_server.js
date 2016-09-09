/*jshint esversion: 6 */

var testServer = require('./test/test_server');


testServer.createServer(() => {}, () => {
    testServer.sendNotification({
        notification: "acceptedNode",
        nodeId: 0,
        accept: 1
    });
});