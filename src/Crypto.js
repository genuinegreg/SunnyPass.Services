'use strict';

/**
 * Crypto module
 * Encrypt and decrypt data using AES.
 */
angular.module('SunnyPass.Crypto', [])
    .service('Crypto', function Crypto() {

        /**
         * Encrypt data
         * @param {String} key encryption key
         * @param {String} data data to encrypt
         * @returns {String|string}
         */
        this.encrypt = function(key, data) {
            var encrypted = CryptoJS.AES.encrypt(data, key);
            return encrypted.toString();
        };

        /**
         * Decrypt data
         * @param {String} key encryption key
         * @param {String} data encrypted data
         * @returns {*|String|string}
         */
        this.decrypt = function(key, data) {
            try {
                var decrypted =  CryptoJS.AES.decrypt(data, key);
                return decrypted.toString(CryptoJS.enc.Utf8);
            }
            catch (err) {
                return;
            }
        };

        /**
         * generate a random key
         * @param {Number} [length] key length (default to 256 bits)
         * @returns {string}
         */
        this.generateKey = function(length) {
            return CryptoJS.lib.WordArray.random( (length || 256)/8).toString(CryptoJS.enc.Hex);
        };

        /**
         * Hash a string using sha3
         * @param {String} string string to hash
         * @param {Number} [length] hash length (default to 256 bits)
         * @returns {*|String|string}
         */
        this.hash = function(string, length) {
            return CryptoJS.SHA3(string, { outputLength: length || 256 }).toString(CryptoJS.enc.Hex);
        };

        /**
         * Devirve an encryption key from a password and a seed
         * @param {String} password
         * @param {String} seed
         * @returns {string}
         */
        this.deriveEncryptionKey = function(password, seed) {
            return CryptoJS.PBKDF2(password, seed, { keySize: 512/32, iterations: 200 }).toString(CryptoJS.enc.Hex);
        };


    });
