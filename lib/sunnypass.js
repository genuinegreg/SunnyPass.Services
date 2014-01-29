'use strict';

/**
 * SunnyPass core module
 */
angular.module('SunnyPass.Service', ['SunnyPass.Crypto', 'jmdobry.angular-cache'])
    .factory('SunnyPass', function SunnyPassFactory($q, $log, $angularCacheFactory, Locker, Secret) {

        // persistent cache used to list locker available on the browser
        var lockersListCache = $angularCacheFactory('lockersListCache', {
            storageMode: 'localStorage',
            verifyIntegrity: true
        });

        // volatile cache use to store unlocked Lockers
        var lockersCache = $angularCacheFactory('lockersCache', {});

        /**
         * SunnyPass constructor
         * @constructor
         */
        function SunnyPass() {
            // enable PouchDB database listing (mostly in order to wipe all database)
            PouchDB.enableAllDbs = true;
            this.lockers = {};
        }

        SunnyPass.BAD_PASSWORD_ERROR = 'BAD_PASSWORD_ERROR';


        /**
         * Return a lockers list promise
         * @returns {[Locker]}
         */
        SunnyPass.prototype.list = function() {
            $log.debug('SunnyPass.list()');
            var _this = this;
            var d = $q.defer();

            async.map(
                lockersListCache.keys(),
                function iterator(sharedKey, cb) {
                    _this.getBySharedSecret(sharedKey).then(
                        function resolved(locker) {
                            cb(undefined, locker);
                        },
                        function rejected() {
                            cb(new Error('Unknown error'));
                        }
                    );
                },
                function callback(err, results) {
                    if (err) {
                        return d.reject(err);
                    }
                    d.resolve(results);
                }
            );


            return d.promise;
        };

        /**
         *
         * @param secret
         * @returns {Promise|*} a Locker promise
         */
        SunnyPass.prototype.get = function(secret) {
            $log.debug('SunnyPass.get()');
            var d = $q.defer();

            if (typeof secret === 'string') {
                secret = new Secret(secret);
            }

            // if locker not present in lockersListCache
            if (!lockersListCache.get(secret.shared)) {
                lockersListCache.put(secret.shared,
                    {
                        secret: secret
                    }
                );
            }

            // find locker in lockerCache
            var locker = lockersCache.get(secret.key);

            // if locker is already in cache
            if (locker) {
                // resolve and return
                d.resolve(locker);
                return d.promise;
            }


            // create a new Locker instance
            locker = new Locker(secret);
            locker.loadMetadata().then(
                function resolved() {
                    $log.debug('metadata resolved', locker);
                    lockersCache.put(secret.key, locker);
                    d.resolve(locker);
                },
                d.reject,
                d.notify
            );



            return d.promise;
        };

        /**
         * Return a locker promise by shared secret
         * @param sharedSecret
         * @returns {*}
         */
        SunnyPass.prototype.getBySharedSecret = function(sharedSecret) {
            $log.debug('SunnyPass.getBySharedSecret()');
            var _this = this;
            var d = $q.defer();

            var item = lockersListCache.get(sharedSecret);

            if (!item) {
                d.reject();
            }
            else {
                _this.get(item.secret).then(
                    d.resolve,
                    d.reject,
                    d.notify
                );
            }

            return d.promise;
        };

        /**
         * Wipe all data
         * @returns {Promise.promise|*}
         */
        SunnyPass.prototype.wipe = function() {
            $log.debug('SunnyPass.wipe()');
//            var _this = this;
            var d = $q.defer();

            // clear caches
            Locker.lockAll();
            lockersListCache.removeAll();
            lockersCache.removeAll();

            // wipe dbs
            PouchDB.allDbs(function(err, dbs) {
                var counter = 0;
                async.each(
                    dbs,
                    function(db, cb) {
                        // delete each db
                        PouchDB.destroy(db, function(err) {
                            if (err) {
                                return cb(err);
                            }
                            d.notify(++counter);
                            cb();
                        });
                    },
                    function callback(err) {
                        if (err) {
                            d.reject(err);
                        }
                        d.resolve();
                    });
            });


            return d.promise;
        };


        return new SunnyPass();
    });
