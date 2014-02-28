'use strict';

describe('Service: Lawnchair', function () {


    // load the service's module
    beforeEach(module('Lawnchair'));
    beforeEach(module('SunnyPass.Crypto'));


    // instantiate service
    var Lawnchair, scope, Crypto, q;
    beforeEach(inject(function (_Lawnchair_, $rootScope, _Crypto_, $q) {
        Lawnchair = _Lawnchair_;
        scope = $rootScope;
        Crypto = _Crypto_;
        q = $q;

    }));

    // nuke Lawnchair
    beforeEach(function (done) {
        Lawnchair.nuke().then(done);
        scope.$apply();
    });


    function testSaveGetFlow(done) {
        var key = 'key' + Math.random();
        var expectedValue = 'expectedValue' + Math.random();


        Lawnchair.save(key, expectedValue).then(
            function () {
                return Lawnchair.get(key)
            }
        ).then(
            function (resolvedValue) {
                resolvedValue.should.equal(expectedValue);

            }
        ).then(done);
        scope.$apply();

    }


    describe('#get()', function () {

        it('should get the same "expectedValue" as saved', testSaveGetFlow);

        it('should reject if there is no value for a key', function (done) {

            var key = 'key' + Math.random();

            Lawnchair.get(key).catch(done)
            scope.$apply();

        });
    })

    describe('.save()', function () {
        it('should save value', testSaveGetFlow);

        it('should update previous value', function (done) {
            var key = 'key' + Math.random();
            var firstValue = 'firstValue' + Math.random();
            var expectedValue = 'expectedValue' + Math.random();


            // save first value
            Lawnchair.save(key, firstValue).
                then(function () { // save expected value
                    Lawnchair.save(key, expectedValue);
                }).
                then(function () { // get resolved value for "key"
                    return Lawnchair.get(key);
                }).then(function (resolvedValue) {
                    resolvedValue.should.equal(expectedValue);

                }).then(done);

            scope.$apply();
        })
    })

    describe('.nuke()', function () {
        it('should nuke all values', function (done) {


            console.log(Lawnchair);

            var key1 = 'key1' + Math.random();
            var key2 = 'key2' + Math.random();
            var value1 = 'value1' + Math.random();
            var value2 = 'value2' + Math.random();


            // save two values
            var savePromise1 = Lawnchair.save(key1, value1);
            var savePromise2 = Lawnchair.save(key2, value2);

            q.all([savePromise1, savePromise2]).
                then( // nuke values
                    Lawnchair.nuke
                ).
                then(function () { // rejection when accessing key1
                    return Lawnchair.get(key1);
                }).
                catch(function () { // rejection when accessing key2
                    return Lawnchair.get(key2);
                }).
                catch( // pass
                    done
                );

            scope.$apply();
        })
    })


});

