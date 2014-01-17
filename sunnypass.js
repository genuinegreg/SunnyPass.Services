'use strict';

/**
 * SunnyPass core module
 */
angular.module('SunnyPass.Service', ['SunnyPass.Crypto'])
    .factory('SunnyPass', function Sunypass($q, $log, Crypto, $timeout) {



        function Secret(key) {
            this.key = key;
            this.shared = 'shared$' + Crypto.hash(key);
            $log.debug('new Secret created', this);
        }

        /**
         * Locker constructor
         * @param {Secret|String} secret
         * @constructor
         */
        function Locker(secret) {
            $log.debug('creating a new Locker with', secret);

            // using or creating a secret
            if (typeof secret === 'string') {
                secret = new Secret(secret);
            }
            this.secret = secret;

            // database config
            var dbUrl = 'http://server:5984/' + secret.shared;
            this.db = new PouchDB(dbUrl);
            $log.debug('PouchDB locker instance conencted on', dbUrl);

            // init encryptionKeyPromises array
            this.encryptionKeyPromises = [];

            // init reload promise
            this.relockDeferred = $q.defer();
        }

        Locker.Metadata = {
            DECRYPT_CHECK: 'META_DECRYPT_CHECK'
        };

        /**
         * Initialize locker
         * Set up metedata in order to check if an encryption key is able to decrypt data contained in this
         * locker
         * @param encryptionKey
         * @returns {Promise.promise|*} promise resolve on initialisazion and reject on database error
         */
        Locker.prototype.initializeLocker = function (encryptionKey) {
            $log.debug('Locker.initializeLocker()...', {
                secret: this.secret,
                encryptionKey: encryptionKey
            });
            var _this = this;
            var d = $q.defer();

            // generating a clue and encrypt it
            var clue = Crypto.generateKey(128);
            var encryptedClue = Crypto.encrypt(encryptionKey, clue);


            // save crypto_clue meta in locker
            _this.db.put({
                    type: 'meta',
                    _id: Locker.Metadata.DECRYPT_CHECK,
                    clear: clue,
                    encrypted: encryptedClue
                },
                function(err, doc) {
                    if (err) {
                        $log.error('Locker.initializeLocker()... FAILED', err);
                        d.reject(err);
                        return;
                    }
                    $log.debug('Locker.initializeLocker()... OK');
                    d.resolve(doc);
                });

            return d.promise;
        };

        /**
         * Check if an encryptionLey can't decrypt data or initialize locker metadata when creating a new one
         * @param encryptionKey
         */
        Locker.prototype.checkEncryptionKey = function(encryptionKey) {
            $log.debug('Locker.checkEncryptionKey()...');
            var _this = this;
            var d = $q.defer();

            // get Metadata DECRYPT_CHECK
            _this.db.get(Locker.Metadata.DECRYPT_CHECK,
                function(err, doc) {

                    $log.debug('Locker.checkEncryptionKey()... loading locker metadata :', doc);

                    if (!doc) {
                        // initialize encryption metadata if not present
                        $log.debug('Locker.checkEncryptionKey()... FAILED... metadata missing... initializing locker now...');
                        _this.initializeLocker(encryptionKey).then(
                            d.resolve,
                            d.reject,
                            d.notify
                        );
                        return;
                    }

                    // checking decrypt check
                    if (doc.clear !== Crypto.decrypt(encryptionKey, doc.encrypted)) {
                        // rejecting if key can't decrypt encrypt check value
                        $log.error('Locker.checkEncryptionKey()... FAILED... bad encryptionKey...');
                        d.reject(new Error('encryption key invalid'));
                        return;
                    }

                    // all good !!!
                    $log.debug('Locker.checkEncryptionKey()... OK');
                    d.resolve();
                });


            return d.promise;
        };

        Locker.prototype.unlock = function(password) {
            var _this = this;
            var unlockDeferred = $q.defer();

            $log.debug('Locker.unlock()...');


            // generate encryption key
            var encryptionKey = CryptoJS.PBKDF2(password, _this.secret.key, { keySize: 512/32, iterations: 200 }).toString(CryptoJS.enc.Hex);

            // check if encryptionKey is valid
            _this.checkEncryptionKey(encryptionKey).then(
                function resolved() {
                    // if all id good, proced
                    _this.encryptionKey = encryptionKey;

                    // resolve previous key promises
                    while(_this.encryptionKeyPromises.length > 0) {
                        var d = _this.encryptionKeyPromises.pop();
                        d.resolve(encryptionKey);
                    }

                    // start relock timer
                    $timeout.cancel(_this.lockingTimeoutPromise);
                    _this.lockingTimeoutPromise = $timeout(function() {
                        _this.lock();
                    }, 5*60*1000);

                    // resolve unlock deferred;
                    $log.debug('Locker.unlock()... OK');
                    unlockDeferred.resolve(encryptionKey);
                },
                function rejected(err) {
                    $log.debug('Locker.unlock()... FAILED', err);
                    unlockDeferred.reject(err);
                },
                unlockDeferred.notify);


            return unlockDeferred.promise;
        };

        Locker.prototype.lock = function() {
            $log.debug('lock()... OK');

            // erase encryptionKey
            this.encryptionKey = undefined;

            // resolve relockDeferred in order to notify this locker is now locked
            this.relockDeferred.resolve();

            // create a new relock
            this.relockDeferred = $q.defer();
        };

        Locker.prototype.getEncryptionKey = function() {
            var _this = this;
            var d = $q.defer();

            var encryptionKey = _this.encryptionKey;

            $log.debug('Locker.getEncryptionKey()...');

            // if key is not available
            if (!encryptionKey) {
                // push deferred in keyPromises to be handle by the next unlock call
                _this.encryptionKeyPromises.push(d);
                // notify locker need to be unlock
                // FIXME: notify is delayed in order to ensure it's processing
                $timeout(d.notify, 250);


                $log.info('Locker.getEncryptionKey()... WAITING... Locker locked, waiting for unlock');
                // and return promise
                return d.promise;
            }

            // if key is available resolve the promise immediately
            $log.debug('Locker.getEncryptionKey()... OK');
            d.resolve(encryptionKey);

            return d.promise;
        };


        /**
         * Return items tag list
         * @returns {Promise.promise|*}
         */
        Locker.prototype.list = function() {
            var _this = this;
            var d = $q.defer();

            $log.debug('Locker.list()...');

            _this.getEncryptionKey().then(
                function resolved(encryptionKey) {

                    function queryCallback(err, results) {

                        if (err) {
                            $log.error('Locker.list()... FAILED...', err);
                            return d.reject(err);
                        }

                        async.map(
                            results.rows,
                            function iterator(item, cb) {
                                try {

                                    item.value.meta = JSON.parse(Crypto.decrypt(encryptionKey, item.value.encryptedMeta));
                                    item.value.tag = Crypto.decrypt(encryptionKey, item.value.encryptedTag);
                                }
                                catch(err) {
                                    $log.error('Locker.list()... FAILED... error parsing doc', item.id);
                                    return cb(err);
                                }

                                cb(undefined, item.value);
                            },
                            function callback(err, list) {
                                if (err) {
                                    d.reject(SunnyPass.BAD_PASSWORD_ERROR);
                                }
                                $log.debug('Locker.list()... OK');
                                d.resolve(list);
                            });

                    }

                    _this.db.query(
                        function (doc) {
                            if (doc.type !== 'data') {
                                return;
                            }
                            emit(doc.encryptedTag, doc);
                        },
                        queryCallback
                    );
                },
                d.reject,
                d.notify
            );

            return d.promise;
        };

        /**
         * Save a new item
         * @param id item tag
         * @param password
         * @returns {Promise.promise|*}
         */
        Locker.prototype.save = function(id, password) {
            $log.debug('Locker.save()...');
            var _this = this;
            var d = $q.defer();

            _this.getEncryptionKey().then(
                function resolved(encryptionKey) {

                    var meta = {
                        updated: new Date()
                    };

                    var data = {
                        password: password
                    };


                    _this.db.post(
                        {
                            type: 'data',
                            encryptedTag: Crypto.encrypt(encryptionKey, id),
                            encryptedData: Crypto.encrypt(encryptionKey, JSON.stringify(data)),
                            encryptedMeta: Crypto.encrypt(encryptionKey, JSON.stringify(meta))
                        },
                        function(err, res) {
                            if (err) {
                                $log.error('Locker.save()... FAILED...', err);
                                d.reject(err);
                                return;
                            }
                            $log.debug('Locker.save()... OK');
                            d.resolve(res);
                        });
                },
                d.reject,
                d.notify);

            return d.promise;
        };

        /**
         * Delete item by id
         * @param id
         * @returns {Promise.promise|*}
         */
        Locker.prototype.deleteById = function(id) {
            $log.debug('Locker.deleteById()...');
            var _this = this;
            var d = $q.defer();

            _this.db.get(id, function(err, doc) {
                if (err) {
                    $log.debug('Locker.deleteById()... FAILED...', err);
                    d.reject(err);
                    return d.promise;
                }
                _this.db.remove(doc, function(err, response) {
                    if (err) {
                        $log.debug('Locker.deleteById()... FAILED...', err);
                        d.reject(err);
                        return d.promise;
                    }
                    $log.debug('Locker.deleteById()... OK');
                    d.resolve(response);
                });
            });


            return d.promise;
        };

        Locker.prototype.unlockData = function(item) {
            $log.debug('Locker.unlockData()...');
            var _this = this;
            var d = $q.defer();

            _this.getEncryptionKey().then(
                function resolved(encryptionKey) {
                    var data = JSON.parse(Crypto.decrypt(encryptionKey, item.encryptedData));
                    d.resolve(data);
                    $log.debug('Locker.unlockData()... OK');
                },
                d.reject,
                d.notify);

            return d.promise;
        };


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
         * @returns {[String]}
         */
        SunnyPass.prototype.list = function() {
            $log.debug('SunnyPass.list()');
            var lockersMap;

            try {
                lockersMap = JSON.parse(localStorage.lockers);
            }
            catch (err) {
                lockersMap = {};
            }

            return lockersMap;
        };

        /**
         *
         * @param secret
         * @returns {Locker|*}
         */
        SunnyPass.prototype.get = function(secret) {
            $log.debug('SunnyPass.get()');

            var _this = this;

            if (typeof secret === 'string') {
                secret = new Secret(secret);
            }


            if (!_this.lockers[secret.key]) {

                // persist locker secret in local storage
                var lockersMap = _this.list();
                if (!lockersMap[secret.shared]) {
                    lockersMap[secret.shared] = secret.key;
                    localStorage.lockers = JSON.stringify(lockersMap);
                }

                // create a new Locker instance
                _this.lockers[secret.key] = new Locker(secret);
            }

            // return Locker instance
            return _this.lockers[secret.key];
        };

        /**
         * Return a locker promise by shared secret
         * @param sharedSecret
         * @returns {*}
         */
        SunnyPass.prototype.getBySharedSecret = function(sharedSecret) {
            $log.debug('SunnyPass.getBySharedSecret()');
            // get secret key and and call Locker.get()
            return this.get(this.list()[sharedSecret]);
        };

        /**
         * Wipe all data
         * @returns {Promise.promise|*}
         */
        SunnyPass.prototype.wipe = function() {
            $log.debug('SunnyPass.wipe()');
            var _this = this;
            var d = $q.defer();
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

                        _this.lockers = {};

                        // finally erase localStorage.lockers
                        localStorage.lockers = undefined;

                        d.resolve();
                    });
            });


            return d.promise;
        };


        return new SunnyPass();
    });
