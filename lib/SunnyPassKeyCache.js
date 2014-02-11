'use strict';

angular.module('SunnyPass.Services')
    .factory('KeyCache', function SunnyPassLockerFactory($log, $interval, $timeout, $q) {

        function KeyCache(options) {
            var _this = this;
            _this.options = {
                maxAge: 5 * 60 * 1000,
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

        /**
         * Save KeuCache state in sessionStorage
         */
        KeyCache.prototype.saveState = function () {

//            console.time('saveState()')
            if (sessionStorage) {
                sessionStorage.spKeyCache = JSON.stringify(this.storage);
            }

//            console.timeEnd('saveState()')
        }

        /**
         * Restore KeyCache state from sessionStorage
         */
        KeyCache.prototype.restoreState = function () {
            if (sessionStorage) {
                try {
                    this.storage = JSON.parse(sessionStorage.spKeyCache);
                    this.storage = this.storage || {};
                }
                catch (err) {
                    this.storage = {};
                }

            }
        }

        /**
         * Destroy KeyCache.
         * Invalidate all items and cancel recycle interval
         */
        KeyCache.prototype.destroy = function () {
            $interval.cancel(this.recycleInterval);
            this.invalidate();
        }

        /**
         * Invalidate an item or the whole cache
         * @param {String} [key] wipe all cache or a specific entry
         */
        KeyCache.prototype.invalidate = function (key) {
            if (!key) {
                this.storage = {};
                this.saveState();
                return;
            }

            // wipe storage and save state
            this.storage[key] = undefined;
            this.saveState();
        }

        /**
         * Put an item in the cache and resolve previous get() for this key
         * @param {String} key item key
         * @param {String} value item value
         * @returns {*}
         */
        KeyCache.prototype.put = function (key, value) {

            var keyValue = this.storage[key];

            // if key doesn't exist we create it
            if (!keyValue) {
                this.storage[key] = {
                    created: Date.now(),
                    accessed: Date.now(),
                    expires: Date.now() + this.options.maxAge,
                    expired: false,
                    value: value
                };
            }
            // if it does, just update it
            else {
                keyValue.created = Date.now();
                keyValue.accessed = Date.now();
                keyValue.expires = Date.now() + this.options.maxAge;
                keyValue.expired = false;
                keyValue.value = value;
            }

            // and return value
            return this.storage[key];
        }


        /**
         * Get value for a key.
         * Item expiration time is reset when accessed via get(), see lookup() is you just want to look item info
         * @param {String} key item key
         * @returns {String} return value or undefined if expired or undefined
         */
        KeyCache.prototype.get = function (key) {

            var keyValue = this.storage[key];

            $log.debug('KeyCache.get(' + key + ')', keyValue);


            // if cache is undefined
            if (!keyValue || keyValue.expired) {
                $log.debug('cache undefined');
                // return undefined
                return undefined;
            }

            // if cache is expired;
            if (keyValue.expires < Date.now()) {
                $log.debug('cache expired');
                // invalidate value
                this.invalidate(key);
                // return undefined
                return undefined;
            }

            // update cache item
            keyValue.accessed = Date.now();
            keyValue.expires = Date.now() + this.options.maxAge;

            // return value
            return keyValue.value;
        }

        /**
         * Similar to get() but do not reset expiration timer
         * @param {String} key
         * @returns {*}
         */
        KeyCache.prototype.lookup = function (key) {

            var keyValue = this.storage[key];
            if (!keyValue || keyValue.expired) {
                return;
            }
            return keyValue;
        }


        return new KeyCache();

    });