'use strict';

/**
 * SunnyPass core module
 */
angular.module('SunnyPass.Service')
    .factory('Secret', function SunnyPassSecretFactory($log, Crypto) {

        function Secret(key) {
            this.key = key;
            this.shared = 'shared$' + Crypto.hash(key);
            $log.debug('new Secret created', this);
        }

        return Secret;
    });
