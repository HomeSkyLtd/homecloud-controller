/*jshint esversion: 6 */

var should = require('should');

var testServer = require("./test_server");
var Homecloud = require('../homecloud').Homecloud;

const testOptions = {
    username: "login123",
    password: "pass123",
    websocket: {
        address: "ws://localhost:8092/ws"
    },
    address: "http://localhost:8093"
};

describe('Homecloud', function() {

    before('Instanciation of Server', (done) => {
        testServer.createServer(done);
    });

    describe('#send()', () => {
        it('should execute without error', (done) => {
            var home = new Homecloud(testOptions);
            home.onAction((msg) => {console.log("GOT ACTION!")})
                .newData([1,2,3]);
            //done();
        });
    });

});