
'use strict';

angular.module('SunnyPass.Service')
    .factory('KeyCache', function SunnyPassLockerFactory($log, $interval) {

        function KeyCache(options) {
            var _this = this;
            _this.options = {
                maxAge: 5 * 1000,
                recycleFreq: 1000
            }
            angular.extend(_this.options, options);

            _this.recycleInterval = $interval(
                function recycle() {

//                    $log.debug('recycle()');

                    Object.keys(_this.storage).forEach(function iterator(key) {
                        var keyValue = _this.storage[key];

                        if (!keyValue) {
                            return;
                        }

                        if (keyValue.expires < Date.now()) {
                            _this.invalidate(key);
                        }
                    });

                    _this.saveState();

                },
                _this.options.recycleFreq
            )

            _this.restoreState();
        }

        KeyCache.prototype.saveState = function() {

//            console.time('saveState()')
            if (sessionStorage) {
                sessionStorage.spKeyCache = JSON.stringify(this.storage);
            }

//            console.timeEnd('saveState()')
        }

        KeyCache.prototype.restoreState = function() {
            if (sessionStorage) {
                try {
                    this.storage = JSON.parse(sessionStorage.spKeyCache);
                    this.storage = this.storage || {};
                }
                catch(err) {
                    this.storage = {};
                }

            }
        }

        KeyCache.prototype.destroy = function() {
            $interval.cancel(this.recycleInterval);
            this.invalidate();
        }

        KeyCache.prototype.invalidate = function(key) {
            if (!key) {
                this.storage = {};
            }

            this.storage[key] = undefined;
        }

        KeyCache.prototype.put = function(key, value) {

            var keyValue = this.storage[key];

            if (!keyValue) {
                this.storage[key] = {
                    created: Date.now(),
                    accessed: Date.now(),
                    expires: Date.now() + this.options.maxAge,
                    expired: false,
                    value: value
                };
            }
            else {
                keyValue.created = Date.now();
                keyValue.accessed = Date.now();
                keyValue.expires = Date.now() + this.options.maxAge;
                keyValue.expired = false;
                keyValue.value = value;
            }

            return this.storage[key];
        }

        KeyCache.prototype.get = function(key) {

            var keyValue = this.storage[key];

            $log.debug('KeyCache.get(' + key + ')', keyValue);

            if (!keyValue || keyValue.expired) {
                return;
            }

            if (keyValue.expires < Date.now()) {
                this.invalidate(key);
            }

            keyValue.accessed = Date.now();
            keyValue.expires = Date.now() + this.options.maxAge;

            return keyValue.value;
        }

        KeyCache.prototype.lookup = function(key) {

            var keyValue = this.storage[key];
            if (!keyValue || keyValue.expired) {
                return;
            }
            return keyValue;
        }


        return new KeyCache();

    });