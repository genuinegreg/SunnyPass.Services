'use strict';

describe('Service: Crypto', function () {

    // load the service's module
    beforeEach(module('SunnyPass.Crypto'));

    // instantiate service
    var Crypto;
    beforeEach(inject(function (_Crypto_) {
        Crypto = _Crypto_;
    }));

    describe('#generateKey()', function() {
        it('should generate random numbers', function() {
            for (var i = 0; i < 20; i++) {
                Crypto.generateKey().should.not.equal(Crypto.generateKey())
            }
        });

        it('should generate a 256bit key by default', function() {
            Crypto.generateKey().should.have.lengthOf(64);
        });

        it('should generate a 128 bits key', function() {
            Crypto.generateKey(128).should.have.lengthOf(32)
        });
    });

    describe('.hash()', function() {
        it('should generate a 256 bits hash by default', function() {
            Crypto.hash('plop').should.have.lengthOf(64);
        });

        it('should generate identical hash for the same string', function() {

            var hash1 = Crypto.hash('plop');
            var hash2 = Crypto.hash('plop');

            hash1.should.equal(hash2);

            for (var i = 0; i < 20; i++) {
                var seed = Crypto.generateKey();

                var hash3 = Crypto.hash(seed);
                var hash4 = Crypto.hash(seed);

                hash3.should.equal(hash4);
            }
        });


        it('should generate distinct hash for distinct string', function() {
            for (var i = 0; i < 20; i++) {
                var seed1 = Crypto.generateKey();
                var seed2 = Crypto.generateKey();

                var hash1 = Crypto.hash(seed1);
                var hash2 = Crypto.hash(seed2);

                hash1.should.not.equal(hash2);
            }
        });
    });

    describe('.encrypt()/.decrypt()', function() {
        it('should encrypt arbitrary data', function() {
            // test on arbitrary data
            var key = Crypto.generateKey(256);
            var data = 'plop';
            var encryptedData = Crypto.encrypt(key, data);
            data.should.not.equal(encryptedData);

            var decryptedData = Crypto.decrypt(key, encryptedData);
            decryptedData.should.equal(data);
        });

        it('should encrypt random data', function() {
            // test on arbitrary data
            for(var i = 0; i < 20; i++) {
                var key = Crypto.generateKey(256);
                var data = Crypto.generateKey(256);

                var encryptedData = Crypto.encrypt(key, data);
                data.should.not.equal(encryptedData);


                var decryptedData = Crypto.decrypt(key, encryptedData);
                decryptedData.should.equal(data);
            }
        });
    });

    describe('.deriveEncryptionKey()', function() {
        it('should generate 512bits key', function() {
            var password = Crypto.generateKey();
            var seed = Crypto.generateKey();
            var key = Crypto.deriveEncryptionKey(password, seed);

            key.should.have.lengthOf(128);
        });

        it('should generate the exact same with the password and seed', function() {
            var password = Crypto.generateKey();
            var seed = Crypto.generateKey();
            var key1 = Crypto.deriveEncryptionKey(password, seed);
            var key2 = Crypto.deriveEncryptionKey(password, seed);

            key1.should.equal(key2);
        });

        it('should generate distincts key with different seed', function() {
            var password = Crypto.generateKey();
            var seed1 = Crypto.generateKey();
            var seed2 = Crypto.generateKey();
            var key1 = Crypto.deriveEncryptionKey(password, seed1);
            var key2 = Crypto.deriveEncryptionKey(password, seed2);

            key1.should.not.equal(key2);
        });

        it('should generate distinct keys with different password', function() {
            // test with strong password
            var password1 = Crypto.generateKey();
            var password2 = Crypto.generateKey();
            var seed1 = Crypto.generateKey();
            var key1 = Crypto.deriveEncryptionKey(password1, seed1);
            var key2 = Crypto.deriveEncryptionKey(password2, seed1);

            key1.should.not.equal(key2);

            // test with weak password
            var password3 = 'a';
            var password4 = 'b';
            var seed3 = Crypto.generateKey();
            var key3 = Crypto.deriveEncryptionKey(password3, seed3);
            var key4 = Crypto.deriveEncryptionKey(password4, seed3);
            key3.should.not.equal(key4);
        });

    });

});
