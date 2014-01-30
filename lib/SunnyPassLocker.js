'use strict';

/**
 * SunnyPass core module
 */
angular.module('SunnyPass.Service')
    .factory('Locker', function SunnyPassLockerFactory($log, $q, $timeout, KeyCache, Crypto, Secret) {

        var DATABASE_SERVER = 'http://server:5984/';

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
            var dbUrl = DATABASE_SERVER + secret.shared;
            this.db = new PouchDB(secret.shared);

            // set up bidirectional replication
            this.db.replicate.to(dbUrl, {
                continuous: true
            });
            this.db.replicate.from(dbUrl, {
                continuous: true
            });
            $log.debug('PouchDB locker instance connected on', dbUrl);


            this.metadata = {};

        }

        Locker.Metadata = {
            DECRYPT_CHECK: 'META_DECRYPT_CHECK',
            NAME: 'META_NAME',
            DESCRIPTION: 'META_DESCRIPTION'
        };


        /**
         * Invalidate all lockers encryption keys
         */
        Locker.lockAll = function() {
            $log.debug('Locker.lockAll()...');
            KeyCache.invalidate();
        };

        Locker.prototype.isLocked = function() {
            var k = KeyCache.lookup(this.secret.key)
            return !k || k.expired;
        };

        Locker.prototype.lock = function() {
            KeyCache.invalidate(this.secret.key);
        };

        Locker.prototype.loadMetadata = function() {
            $log.debug('Locker.loadMetadata()...');
            var _this = this;
            var d = $q.defer();
            // loading each metadata from Locker.Metadata
            async.each(
                Object.keys(Locker.Metadata),
                function iterator(key, cb) {
                    _this.db.get(Locker.Metadata[key], function(err, doc) {

                        if (err && err.status !== 404) {
                            return cb(err);
                        }

                        if (!doc) {
                            // if metadata is not present just pass
                            return cb();
                        }

                        // save metadata value
                        _this.metadata[key.toLowerCase()] = Crypto.decrypt(_this.secret.key, doc.value);

                        cb();

                    });
                },
                function callback(err) {
                    if (err) {
                        return d.reject(err);
                    }
                    d.resolve();
                }
            );


            return d.promise;
        };

        Locker.prototype.saveMetadata = function(key, value) {
            var d = $q.defer();
            var _this = this;
            _this.db.get(Locker.Metadata[key], function (err, doc) {
                if (err && err.status !== 404) {
                    $log.debug('Locker.saveMetadata()... FAILED...', err);
                    return d.reject(err);
                }

                if (!doc) {

                    $log.debug('Locker.saveMetadata()... no previous value...');

                    doc = {
                        _id: Locker.Metadata[key],
                        type: 'meta'
                    };

                }

                doc.value = Crypto.encrypt(_this.secret.key, value);

                _this.db.put(doc, function(err) {
                    if (err) {
                        $log.debug('Locker.saveMetadata()... FAILED...', err);
                        return d.reject(err);
                    }

                    _this.metadata[key.toLowerCase()] = value;

                    d.resolve(doc);
                    $log.debug('Locker.saveMetadata()... OK');
                });

            });


            return d.promise;
        };

        Locker.prototype.setName = function(name) {

            var d = $q.defer();
            this.name = name;

            this.db.put({
                    _id: Locker.Metadata.NAME,
                    value: name
                },
                function(err) {
                    if (err) {
                        d.reject(err);
                        return;
                    }
                    d.resolve(name);
                });


            return d.promise;
        };


        /**
         * Unlock locker
         * @param password locker's passphrase
         * @returns {Promise.promise|*} resolve if password is ok, rejected in other case
         */
        Locker.prototype.unlock = function(password) {
            var _this = this;
            var unlockDeferred = $q.defer();

            $log.debug('Locker.unlock()...');

            // generate encryption key
            var encryptionKey = Crypto.deriveEncryptionKey(password, _this.secret.key);

            // check if encryptionKey is valid
            _this._checkEncryptionKey(encryptionKey).then(
                function resolved() {
                    // if all is good save the encryption key
                    KeyCache.put(_this.secret.key, encryptionKey);

                    // and resolve unlock deferred;
                    $log.debug('Locker.unlock()... OK');
                    unlockDeferred.resolve(encryptionKey);
                },
                unlockDeferred.reject,
                unlockDeferred.notify);


            return unlockDeferred.promise;
        };


        /**
         * Initialize locker
         * Set up metadata in order to check if an encryption key is able to decrypt data contained in this
         * locker
         * @param encryptionKey
         * @returns {Promise.promise|*} promise resolve on initialisazion and reject on database error
         */
        Locker.prototype._initializeLocker = function (encryptionKey) {
            $log.debug('Locker._initializeLocker()...');
            var _this = this;
            var d = $q.defer();

            // generating a clue and encrypt it
            var encryptedClue = Crypto.encrypt(encryptionKey, Crypto.generateKey(128));


            // save crypto_clue meta in locker
            _this.db.put({
                    type: 'meta',
                    _id: Locker.Metadata.DECRYPT_CHECK,
                    value: encryptedClue
                },
                function(err) {
                    if (err) {
                        $log.error('Locker._initializeLocker()... FAILED', err);
                        d.reject(err);
                        return;
                    }
                    $log.debug('Locker._initializeLocker()... OK');
                    d.resolve(encryptionKey);
                });

            return d.promise;
        };

        /**
         * Check if an encryptionLey can't decrypt data or initialize locker metadata when creating a new one
         * @param encryptionKey
         */
        Locker.prototype._checkEncryptionKey = function(encryptionKey) {
            $log.debug('Locker._checkEncryptionKey()...');
            var _this = this;
            var d = $q.defer();

            // get Metadata DECRYPT_CHECK
            _this.db.get(Locker.Metadata.DECRYPT_CHECK,
                function(err, doc) {

                    $log.debug('Locker._checkEncryptionKey()... loading locker metadata :', doc);

                    if (!doc) {
                        // initialize encryption metadata if not present
                        $log.debug('Locker._checkEncryptionKey()... FAILED... metadata missing... initializing locker now...');
                        _this._initializeLocker(encryptionKey).then(
                            d.resolve,
                            d.reject,
                            d.notify
                        );
                        return;
                    }

                    // checking if encryption key can decrypt Locker.Metadata.DECRYPT_CHECK value
                    if (!Crypto.decrypt(encryptionKey, doc.value)) {
                        // rejecting if key can't decrypt encrypt check value
                        $log.error('Locker._checkEncryptionKey()... FAILED... bad encryptionKey...');
                        d.reject(new Error('encryption key invalid'));
                        return;
                    }

                    // all good !!!
                    $log.debug('Locker._checkEncryptionKey()... OK');
                    d.resolve(encryptionKey);
                });


            return d.promise;
        };


        Locker.prototype._getEncryptionKey = function() {
            var _this = this;
            var d = $q.defer();

            // get encryption key from cache
            var encryptionKey = KeyCache.get(_this.secret.key);

            if (!encryptionKey) {
                // if not present notify()
                $timeout(d.notify, 400);
            }
            else {
                // or resolve encryption key
                d.resolve(encryptionKey);
                // and reset encryption key expiration
                KeyCache.put(_this.secret.key, encryptionKey);
            }

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


            _this._getEncryptionKey().then(
                function resolved(encryptionKey) {
                    // database query callback
                    function queryCallback(err, results) {

                        // database errors
                        if (err) {
                            $log.error('Locker.list()... FAILED...', err);
                            return d.reject(err);
                        }

                        // reformat database results
                        async.map(
                            results.rows,
                            function iterator(item, cb) {
                                try {
                                    // try decrypt encrypted metadata and data
                                    item.value.meta = JSON.parse(Crypto.decrypt(encryptionKey, item.value.encryptedMeta));

                                    // add data flags
                                    var data = JSON.parse(Crypto.decrypt(encryptionKey, item.value.encryptedData));
                                    item.value.meta.password = !!data.password;
                                    item.value.meta.login = !!data.login;
                                    item.value.meta.notes = !!data.notes;

                                }
                                catch(err) {
                                    $log.error('Locker.list()... FAILED... error parsing doc', item.id);
                                    return cb(err);
                                }

                                cb(undefined, item.value);
                            },
                            function callback(err, list) {
                                if (err) {
                                    d.reject(err);
                                }
                                $log.debug('Locker.list()... OK');
                                d.resolve(list);
                            });

                    }




                    _this.db.query(
                        // exec database query searching for 'data' docs
                        function (doc) {
                            if (doc.type !== 'data') {
                                return;
                            }
                            emit(doc.encryptedTag, doc);
                        },
                        // filter results with queryCallback()
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
        Locker.prototype.save = function(item) {
            $log.debug('Locker.save()...');
            var _this = this;
            var d = $q.defer();

            _this._getEncryptionKey().then(
                function resolved(encryptionKey) {

                    item.meta = item.meta || {};
                    item.data = item.data || {};

                    // reset updated date
                    item.meta.updated = new Date();

                    item.type = 'data';


                    // encrypt meta
                    item.encryptedMeta = Crypto.encrypt(encryptionKey, JSON.stringify(item.meta));
                    item.meta = undefined;

                    // encrypt data
                    item.encryptedData = Crypto.encrypt(encryptionKey, JSON.stringify(item.data));
                    item.data = undefined;


                    /**
                     * callback for db.put or db.post
                     * @param err
                     * @param res
                     */
                    function dbCallback(err, res) {
                        if (err) {
                            $log.error('Locker.save()... FAILED...', err);
                            d.reject(err);
                            return;
                        }
                        $log.debug('Locker.save()... OK', res);
                        d.resolve(res);
                    }

                    // if item has already an _id and a _rev
                    if (item._id && item._rev) {
                        // call put()
                        _this.db.put(
                            item,
                            dbCallback);
                    }
                    // if one of them is undefined
                    else {
                        // make sure both of them are undefiend
                        item._id = undefined;
                        item._rev = undefined;

                        // and call post();
                        _this.db.post(
                            item,
                            dbCallback);
                    }
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

        /**
         * Get a locker's item and decrypt meta and data
         * @param item a locker item object with encrypted
         * @returns {Promise.promise|*}
         */
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
         * Get a specific locker item with decrypted meta AND data
         * @param itemId
         * @returns {Promise.promise|*}
         */
        Locker.prototype.get = function(itemId) {
            $log.debug('Locker.get(itemId)...');
            var _this = this;
            var d = $q.defer();

            _this._getEncryptionKey().then(
                function resolved(encryptionKey) {

                    _this.db.get(itemId, function(err, doc) {
                        if (err || !doc) {
                            $log.debug('Locker.get(itemId)... FAILED !', err);
                            d.reject(err);
                            return;
                        }

                        doc.meta = JSON.parse(Crypto.decrypt(encryptionKey, doc.encryptedMeta));
                        doc.data = JSON.parse(Crypto.decrypt(encryptionKey, doc.encryptedData));

                        $log.debug('Locker.get(itemId)... OK');
                        d.resolve(doc);
                    })
                },
                d.reject,
                d.notify);


            return d.promise;
        }

        return Locker;
    });
