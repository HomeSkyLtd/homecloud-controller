/*jshint esversion: 6 */

var testServer = require('./test/test_server');


testServer.createServer(() => {}, () => {
    testServer.sendNotification({
        notification: "acceptedNode",
        nodeId: 0,
        accept: 1
    });
    setTimeout(() => {
        testServer.sendNotification({
            notification: "newAction",
            action: 
                {
                    nodeId: 0,
                    commandId: 1,
                    value: 1
                }
        });
    }, 100);
});