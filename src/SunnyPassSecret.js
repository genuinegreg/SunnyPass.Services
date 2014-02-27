'use strict';

/**
 * SunnyPass core module
 */
angular.module('SunnyPass.Services')
    .factory('Secret', function SunnyPassSecretFactory($log, Crypto) {

        /**
         * Secret contructor
         * @param key
         * @constructor
         */
        function Secret(key) {
            this.key = key;
            this.shared = 'shared$' + Crypto.hash(key);
            $log.debug('new Secret created', this);
        }

        return Secret;
    });
