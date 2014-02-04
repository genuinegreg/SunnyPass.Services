
'use strict';

angular.module('SunnyPass.Service')
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
            _this.unlockPromises = {};
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
                this.unlockPromises = {};
                this.saveState();
                return;
            }

            // wipe storage and save state
            this.storage[key] = undefined;
            this.saveState();

            // reject queued promises and wipe unlockPromises array
            if (this.unlockPromises[key]) {
                while (this.unlockPromises[key].length > 0) {
                    this.unlockPromises[key].pop().reject();
                }
                this.unlockPromises[key] = undefined
            }
        }

        KeyCache.prototype.put = function(key, value) {

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

            // resolve unlock promises
            while (this.unlockPromises[key] && this.unlockPromises[key].length > 0) {
                var d = this.unlockPromises[key].pop();
                d.resolve(this.storage[key].value);
            }


            // and return value
            return this.storage[key];
        }

        KeyCache.prototype.queuePromise = function(key, deferred) {
            if (!this.unlockPromises[key]) {
                this.unlockPromises[key] = [];
            }
            this.unlockPromises[key].push(deferred);
        }

        KeyCache.prototype.get = function(key) {

            var d = $q.defer();

            var keyValue = this.storage[key];

            $log.debug('KeyCache.get(' + key + ')', keyValue);



            // if cache is undefined
            if (!keyValue || keyValue.expired) {
                $log.debug('cache undefined');
                // queue unlockPromise
                this.queuePromise(key, d);
                // notify and return promise
                $timeout(function() {
                    d.notify('undefined');
                }, 0);
                return d.promise;
            }

            // if cache is expired;
            if (keyValue.expires < Date.now()) {
                $log.debug('cache expired');
                // invalidate value
                this.invalidate(key);
                // queue unlockPromise
                this.queuePromise(key, d);
                // notify and return promise
                $timeout(function() {
                    d.notify('expired');
                }, 0);
                return d.promise;
            }

            // update cache item
            keyValue.accessed = Date.now();
            keyValue.expires = Date.now() + this.options.maxAge;


            // and resolve promise
            d.resolve(keyValue.value);

            return d.promise;
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