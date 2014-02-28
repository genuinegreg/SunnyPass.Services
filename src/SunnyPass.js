'use strict';

/**
 * SunnyPass core module
 */
angular.module('SunnyPass.Services', ['SunnyPass.Crypto', 'Lawnchair', 'jmdobry.angular-cache'])
    .factory('SunnyPass', function SunnyPassFactory($q, $log, $angularCacheFactory, Lawnchair, Locker, Secret) {

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
        SunnyPass.prototype.list = function () {
            $log.debug('SunnyPass.list()');
            var _this = this;
            var d = $q.defer();


            Lawnchair.keys().then(
                function resolved(keys) {
                    async.map(
                        keys,
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
                }
            );


            return d.promise;
        };

        /**
         *
         * @param secret
         * @returns {Promise|*} a Locker promise
         */
        SunnyPass.prototype.get = function (secret) {
            $log.debug('SunnyPass.get()');
            var d = $q.defer();

            if (typeof secret === 'string') {
                secret = new Secret(secret);
            }

            // asynchronously update lockers list (eventual consistency is OK)
            Lawnchair.save(secret.shared,
                {
                    secret: secret
                }
            );

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
        SunnyPass.prototype.getBySharedSecret = function (sharedSecret) {
            $log.debug('SunnyPass.getBySharedSecret()');
            var _this = this;


            return Lawnchair.get(sharedSecret).then(
                function resolved(item) {
                    if (!item) {
                        return $q.reject()
                    }

                    return _this.get(item.secret);
                }
            );
        };

        SunnyPass.prototype.wipeLocker = function (secret) {
            if (typeof secret === 'string') {
                secret = new Secret(secret);
            }

            function destroy(locker) {
                locker.wipe();
            }

            return this.get(secret).then(
                    // destroy locker
                    destroy
                ).then(
                function resovled() {
                    // and clear locker list and locker cache
                    lockersCache.remove(secret.key);
                    return Lawnchair.remove(secret.shared);
                }
            );

        }

        /**
         * Wipe all data
         * @returns {Promise.promise|*}
         */
        SunnyPass.prototype.wipe = function () {
            $log.debug('SunnyPass.wipe()');
//            var _this = this;
            var d = $q.defer();

            // clear caches
            Locker.lockAll();
            Lawnchair.nuke();
            lockersCache.removeAll();

            // wipe dbs
            PouchDB.allDbs(function (err, dbs) {
                var counter = 0;
                async.each(
                    dbs,
                    function (db, cb) {
                        // delete each db
                        PouchDB.destroy(db, function (err) {
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
