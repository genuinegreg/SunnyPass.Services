'use strict';

describe('Service: Crypto', function () {

    // load the service's module
    beforeEach(module('SunnyPass.Crypto'));

    // instantiate service
    var Crypto;
    beforeEach(inject(function (_Crypto_) {
        Crypto = _Crypto_;
    }));

    describe('.generateKey()', function() {
        it('should generate random numbers', function() {
            for (var i = 0; i < 20; i++) {
                expect(Crypto.generateKey()).not.toEqual(Crypto.generateKey());
            }
        });

        it('should generate a 256bit key by default', function() {
            expect(Crypto.generateKey().length).toEqual(64);
        });

        it('should generate a 128 bits key', function() {
            expect(Crypto.generateKey(128).length).toEqual(32);
        });
    });

    describe('.hash()', function() {
        it('should generate a 256 bits hash by default', function() {
            expect(Crypto.hash('plop').length).toEqual(64);
        });

        it('should generate identical hash for the same string', function() {

            var hash1 = Crypto.hash('plop');
            var hash2 = Crypto.hash('plop');


            expect(hash1).toEqual(hash2);

            for (var i = 0; i < 20; i++) {
                var seed = Crypto.generateKey();

                var hash3 = Crypto.hash(seed);
                var hash4 = Crypto.hash(seed);

                expect(hash3).toEqual(hash4);
            }
        });


        it('should generate distinct hash for distinc string', function() {
            for (var i = 0; i < 20; i++) {
                var seed1 = Crypto.generateKey();
                var seed2 = Crypto.generateKey();

                var hash1 = Crypto.hash(seed1);
                var hash2 = Crypto.hash(seed2);

                expect(hash1).not.toEqual(hash2);
            }
        });
    });

    describe('.encrypt()/.decrypt()', function() {
        it('should encrypt arbitrary data', function() {
            // test on arbitrary data
            var key = Crypto.generateKey(256);
            var data = 'plop';
            var encryptedData = Crypto.encrypt(key, data);
            expect(data).not.toEqual(encryptedData);

            var decryptedData = Crypto.decrypt(key, encryptedData);
            expect(decryptedData).toEqual(data);
        });

        it('should encrypt random data', function() {
            // test on arbitrary data
            for(var i = 0; i < 20; i++) {
                var key = Crypto.generateKey(256);
                var data = Crypto.generateKey(256);
                var encryptedData = Crypto.encrypt(key, data);
                expect(data).not.toEqual(encryptedData);

                var decryptedData = Crypto.decrypt(key, encryptedData);
                expect(decryptedData).toEqual(data);
            }
        });
    });

    describe('deriveEncryptionKey()', function() {
        it('should generate 512bits key', function() {
            var password = Crypto.generateKey();
            var seed = Crypto.generateKey();
            var key = Crypto.deriveEncryptionKey(password, seed);
            expect(key.length).toEqual(128);
        });

        it('should generate the exact same with the password and seed', function() {
            var password = Crypto.generateKey();
            var seed = Crypto.generateKey();
            var key1 = Crypto.deriveEncryptionKey(password, seed);
            var key2 = Crypto.deriveEncryptionKey(password, seed);
            expect(key1).toEqual(key2);
        });

        it('should generate distincts key with different seed', function() {
            var password = Crypto.generateKey();
            var seed1 = Crypto.generateKey();
            var seed2 = Crypto.generateKey();
            var key1 = Crypto.deriveEncryptionKey(password, seed1);
            var key2 = Crypto.deriveEncryptionKey(password, seed2);
            expect(key1).not.toEqual(key2);
        });

        it('should generate distinct keys with different password', function() {
            // test with strong password
            var password1 = Crypto.generateKey();
            var password2 = Crypto.generateKey();
            var seed1 = Crypto.generateKey();
            var key1 = Crypto.deriveEncryptionKey(password1, seed1);
            var key2 = Crypto.deriveEncryptionKey(password2, seed1);
            expect(key1).not.toEqual(key2);

            // test with weak password
            var password3 = 'a';
            var password4 = 'b';
            var seed3 = Crypto.generateKey();
            var key3 = Crypto.deriveEncryptionKey(password3, seed3);
            var key4 = Crypto.deriveEncryptionKey(password4, seed3);
            expect(key3).not.toEqual(key4);
        });

    });

});
