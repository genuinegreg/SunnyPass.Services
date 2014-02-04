'use strict';

describe('Service: SunnyPassKeyCache', function() {

    // load the service's module
    beforeEach(module('SunnyPass.Services'));

    // instantiate service
    var KeyCache;
    beforeEach(inject(function (_KeyCache_) {
        KeyCache = _KeyCache_;
        KeyCache.invalidate();
    }));

    describe('.put()', function() {
        it('should add key to the cache', inject(function($rootScope, Crypto) {

            var key = 'key_' + Crypto.generateKey(32);
            var expectedValue = 'expectedKey_' + Crypto.generateKey(32);

            var resolvedValue;

            runs(function() {

                KeyCache.put(key, expectedValue);

                var promise = KeyCache.get(key);

                promise.then(
                    function resolved(resultValue) {
                        resolvedValue = resultValue;
                    });

                $rootScope.$apply();
            })

            waitsFor(function() {
                return resolvedValue;
            }, 'value to be defined', 500);

            runs(function() {
                expect(resolvedValue).toEqual(expectedValue);
            })
        }))

        it('should notify missing key and resolve it on KeyCache.put() call', inject(function($rootScope, Crypto, $timeout) {
            var key = 'key_' + Crypto.generateKey(32);
            var expectedValue = 'expectedKey_' + Crypto.generateKey(32);

            var resolvedValue;
            var hasBeenNotified;

            runs(function() {

                KeyCache.get(key).then(
                    function resolved(resultValue) {
                        console.log('resolved !!!', resultValue)
                        resolvedValue = resultValue;
                    },
                    undefined,
                    function notified() {
                        console.log('notified !!!');
                        hasBeenNotified = true;
                    });


                console.log('KeyCache.het();')
                $rootScope.$apply();

                $timeout(function() {
                    $timeout.flush();
                    KeyCache.put(key, expectedValue);
                    $timeout.flush();
                    console.log('KeyCache.put()')
                }, 500);

                $timeout.flush();
                $rootScope.$apply();
            })

            waitsFor(function() {
                console.log(resolvedValue, hasBeenNotified)
                return resolvedValue && hasBeenNotified;
            }, 'resolvedValue and hasBeenNotified to be defined', 1000);

            runs(function() {
                expect(resolvedValue).toEqual(expectedValue);
            })
        }));


        it('should queue multiple missing key and resolve them on KeyCache.put() call', inject(function($rootScope, Crypto, $timeout) {
            var key = 'key_' + Crypto.generateKey(32);
            var expectedValue = 'expectedKey_' + Crypto.generateKey(32);

            var resolvedValue1;
            var resolvedValue2;

            runs(function() {

                KeyCache.get(key).then(
                    function resolved(resultValue) {
                        resolvedValue1 = resultValue;
                    });

                $rootScope.$apply();

                KeyCache.get(key).then(
                    function resolved(resultValue2) {
                        resolvedValue2 = resultValue2;
                    });

                $rootScope.$apply();

                $timeout(function() {
                    $timeout.flush();
                    KeyCache.put(key, expectedValue);
                    $timeout.flush();
                    console.log('KeyCache.put()')
                }, 500);

                $timeout.flush();
                $rootScope.$apply();
            })

            waitsFor(function() {
                return resolvedValue1 && resolvedValue2;
            }, 'resolvedValue and hasBeenNotified to be defined', 1000);

            runs(function() {
                expect(resolvedValue1).toEqual(expectedValue);
                expect(resolvedValue2).toEqual(expectedValue);
            })
        }));
    })


})