'use strict';

describe('Service: SunnyPassKeyCache', function () {

    // load the service's module
    beforeEach(module('SunnyPass.Services'));

    // instantiate service
    var KeyCache;
    beforeEach(inject(function (_KeyCache_) {
        KeyCache = _KeyCache_;
        KeyCache.invalidate();
    }));

    describe('.put()/.get()', function () {
        it('should add key to the cache', inject(function ($rootScope, Crypto) {

            var key = 'key_' + Crypto.generateKey(32);
            var expectedValue = 'expectedKey_' + Crypto.generateKey(32);

            // puts key in cache
            KeyCache.put(key, expectedValue);

            var resolvedValue = KeyCache.get(key);

            expect(resolvedValue).toEqual(expectedValue);
        }))

        it('should return undefined if their is not entry in cache', inject(function ($rootScope, Crypto, $timeout) {
            var key = 'key_' + Crypto.generateKey(32);

            var resolvedValue = KeyCache.get(key);
            expect(resolvedValue).not.toBeDefined();

        }));


    })


})