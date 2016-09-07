/*jshint esversion: 6 */

var should = require('should');

var testServer = require("./test_server");
var Homecloud = require('../homecloud').Homecloud;

const testOptions = {
    username: "login123",
    password: "pass123",
    websocket: {
        address: "ws://localhost:8092/ws",
        retryConnectionTime: 50  
    },
    address: "http://localhost:8093",
    retryMessageTime: 100
};

describe('Homecloud', function() {
    var home;
    before('Instanciation of test Server and homecloud', (done) => {
        testServer.createServer(() => {
            home = new Homecloud(testOptions);
            done();
        });
    });

    afterEach('remove notifications', (done) => {
        home.onAction(null)
            .onRules(null)
            .onAcceptNode(null)
            .onRemoveNode(null);
        done();
    });

    after('Destroying server', (done) => {
        testServer.closeServer();
        home.close();
        done();
    });

    describe('#newNodes()', () => {
        const nodes = [
        {
            "nodeId": 1,
            "nodeClass": "test"
        },
        {
            "nodeId": 2,
            "nodeClass": "default"
        }
        ];
        it('should execute without error', (done) => {
            home.newNodes(nodes, (data) => {
                data.should.eql({
                    status: 200,
                    echo: {
                        function: "newDetectedNodes",
                        node: nodes
                    }
                });
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
        });
    });

    describe('#newData()', () => {
        const newData = [
        {
            "nodeId": 1,
            "dataId": 2,
            "value": 10
        },
        {
            "nodeId": 2,
            "dataId": 1,
            "value": 5
        }
        ];
        it('should execute without error', (done) => {
            home.newData(newData, (data) => {
                data.should.eql({
                    status: 200,
                    echo: {
                        function: "newData",
                        data: newData
                    }
                });
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
        });
    });

    describe('#newCommand()', () => {
        const command = [
        {
            "nodeId": 1,
            "commandId": 2,
            "value": 10
        },
        {
            "nodeId": 2,
            "commandId": 1,
            "value": 5
        }
        ];
        it('should execute without error', (done) => {
            home.newCommand(command, (data) => {
                data.should.eql({
                    status: 200,
                    echo: {
                        function: "newCommand",
                        command: command
                    }
                });
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
        });
    });

    describe('#setNodeState()', () => {
        it('should execute without error', (done) => {
            home.setNodeState(1, false, (data) => {
                data.should.eql({
                    status: 200,
                    echo: {
                        function: "setNodeState",
                        nodeId: 1,
                        alive: 0
                    }
                });
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
        });
    });

    describe('#actionResult()', () => {
        const action = {
            nodeId: 1,
            controllerId: 1
        };
        it('should execute without error', (done) => {
            home.actionResult(action, true, (data) => {
                data.should.eql({
                    status: 200,
                    echo: {
                        function: "actionResult",
                        result: 1,
                        action: action
                    }
                });
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
        });
    });

    describe('#getRules()', () => {
        const rules = [
        {
            nodeId: 1,
            controllerId: 1,
            commandId: 1,
            value: 1,
            clauses: []
        },
        {
            nodeId: 2,
            controllerId: 1,
            commandId: 3,
            value: 0,
            clauses: []
        }
        ];
        it('should execute without error', (done) => {
            home.getRules((data) => {
                data.should.eql({
                    status: 200,
                    echo: {
                        function: "getRules",
                    },
                    rules: rules
                });
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
        });
    });

    describe('#onAction()', () => {
        const notification = {
            notification: "newAction",
            action: {
                nodeId: 1,
                controllerId: 1,
                commandId: 1,
                value: 0
            }
        };
        it('should receive a notification', (done) => {
            home.onAction((data) => {
                data.should.eql(notification);
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
            testServer.sendNotification(notification);
        });
    });

    describe('#onRules()', () => {
        const notification = {
            notification: "newRules",
            quantity: 2
        };
        it('should receive a notification', (done) => {
            home.onRules((data) => {
                data.should.eql(notification);
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
            testServer.sendNotification(notification);
        });
    });

    describe('#onAcceptNode()', () => {
        const notification = {
            notification: "acceptedNode",
            nodeId: 1,
            accept: 1
        };
        it('should receive a notification', (done) => {
            home.onAcceptNode((data) => {
                data.should.eql(notification);
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
            testServer.sendNotification(notification);
        });
    });

    describe('#onRemoveNode()', () => {
        const notification = {
            notification: "removedNode",
            nodeId: 1
        };
        it('should receive a notification', (done) => {
            home.onRemoveNode((data) => {
                data.should.eql(notification);
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
            testServer.sendNotification(notification);
        });
    });

    describe("Testing message queue", () => {
        const nodes = [
        {
            "nodeId": 1,
            "nodeClass": "test"
        },
        {
            "nodeId": 2,
            "nodeClass": "default"
        }
        ];
        it('should send all message', (done) => {
            var count = 0;
            var execute = () => {
                home.newNodes(nodes, (data) => {
                    data.should.eql({
                        status: 200,
                        echo: {
                            function: "newDetectedNodes",
                            node: nodes
                        }
                    });
                    count++;
                    if (count == 3)
                        done();

                }, (err) => {
                    done(new Error("Sent with error"));
                });
            };
            testServer.stopHttpServer();
            for (var i = 0; i < 3; i++)
                execute();
            setTimeout(() => {
                testServer.restartHttpServer();
            }, 10);
        });
    });

    describe('Testing WebSocket reconnection', () => {
        const notification = {
            notification: "acceptedNode",
            nodeId: 1,
            accept: 1
        };
        it('should receive a notification', (done) => {
            home.onAcceptNode((data) => {
                data.should.eql(notification);
                done();

            }, (err) => {
                done(new Error("Sent with error"));
            });
            testServer.stopWebsocket();
            testServer.restartWebsocket(() => {
                testServer.sendNotification(notification);
            });
        });
    });

});