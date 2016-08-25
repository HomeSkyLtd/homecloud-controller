/*jshint esversion: 6 */

var should = require('should');

var testServer = require("./test_server");
var Homecloud = require('../homecloud').Homecloud;

describe('Homecloud', function() {
    var driver1, driver2;

    before('Instanciation of Server', (done) => {
       done();
    });

    describe('#send()', () => {
        it('should execute without error', (done) => {
            var home = new Homecloud('http://localhost:8093', '');
            home.newData([{nodeId: 1, dataId: 1, value: 0, timestamp: 0}], done);
            //node1.send(getDriver2Address(), { packageType: Rainfall.PACKAGE_TYPES.whoiscontroller}, (err) => {
               // should(err).not.be.Error();
            //done();
            //});
        });
    });

});