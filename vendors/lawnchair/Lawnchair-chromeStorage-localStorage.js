/**
 * Lawnchair!
 * ---
 * clientside json store
 *
 */
var Lawnchair = function () {
    // lawnchair requires json 
    if (!JSON) throw 'JSON unavailable! Include http://www.json.org/json2.js to fix.'
    // options are optional; callback is not
    if (arguments.length <= 2 && arguments.length > 0) {
        var callback = (typeof arguments[0] === 'function') ? arguments[0] : arguments[1]
            , options = (typeof arguments[0] === 'function') ? {} : arguments[0]
    } else {
        throw 'Incorrect # of ctor args!'
    }
    // TODO perhaps allow for pub/sub instead?
    if (typeof callback !== 'function') throw 'No callback was provided';

    // ensure we init with this set to the Lawnchair prototype
    var self = (!(this instanceof Lawnchair))
        ? new Lawnchair(options, callback)
        : this

    // default configuration 
    self.record = options.record || 'record'  // default for records
    self.name = options.name || 'records' // default name for underlying store

    // mixin first valid  adapter
    var adapter
    // if the adapter is passed in we try to load that only
    if (options.adapter) {
        adapter = Lawnchair.adapters[self.indexOf(Lawnchair.adapters, options.adapter)]
        adapter = adapter.valid() ? adapter : undefined
        // otherwise find the first valid adapter for this env
    }
    else {
        for (var i = 0, l = Lawnchair.adapters.length; i < l; i++) {
            adapter = Lawnchair.adapters[i].valid() ? Lawnchair.adapters[i] : undefined
            if (adapter) break
        }
    }

    // we have failed 
    if (!adapter) throw 'No valid adapter.'

    // yay! mixin the adapter 
    for (var j in adapter)
        self[j] = adapter[j]

    // call init for each mixed in plugin
    for (var i = 0, l = Lawnchair.plugins.length; i < l; i++)
        Lawnchair.plugins[i].call(self)

    // init the adapter 
    self.init(options, callback)

    // called as a function or as a ctor with new always return an instance
    return self
}

Lawnchair.adapters = []

/**
 * queues an adapter for mixin
 * ===
 * - ensures an adapter conforms to a specific interface
 *
 */
Lawnchair.adapter = function (id, obj) {
    // add the adapter id to the adapter obj
    // ugly here for a  cleaner dsl for implementing adapters
    obj['adapter'] = id
    // methods required to implement a lawnchair adapter 
    var implementing = 'adapter valid init keys save batch get exists all remove nuke'.split(' ')
        , indexOf = this.prototype.indexOf
    // mix in the adapter   
    for (var i in obj) {
        if (indexOf(implementing, i) === -1) throw 'Invalid adapter! Nonstandard method: ' + i
    }
    // if we made it this far the adapter interface is valid 
    Lawnchair.adapters.push(obj)
}

Lawnchair.plugins = []

/**
 * generic shallow extension for plugins
 * ===
 * - if an init method is found it registers it to be called when the lawnchair is inited
 * - yes we could use hasOwnProp but nobody here is an asshole
 */
Lawnchair.plugin = function (obj) {
    for (var i in obj)
        i === 'init' ? Lawnchair.plugins.push(obj[i]) : this.prototype[i] = obj[i]
}

/**
 * helpers
 *
 */
Lawnchair.prototype = {

    isArray: Array.isArray || function (o) {
        return Object.prototype.toString.call(o) === '[object Array]'
    },

    /**
     * this code exists for ie8... for more background see:
     * http://www.flickr.com/photos/westcoastlogic/5955365742/in/photostream
     */
    indexOf: function (ary, item, i, l) {
        if (ary.indexOf) return ary.indexOf(item)
        for (i = 0, l = ary.length; i < l; i++) if (ary[i] === item) return i
        return -1
    },

    // awesome shorthand callbacks as strings. this is shameless theft from dojo.
    lambda: function (callback) {
        return this.fn(this.record, callback)
    },

    // first stab at named parameters for terse callbacks; dojo: first != best // ;D
    fn: function (name, callback) {
        return typeof callback == 'string' ? new Function(name, callback) : callback
    },

    // returns a unique identifier (by way of Backbone.localStorage.js)
    // TODO investigate smaller UUIDs to cut on storage cost
    uuid: function () {
        var S4 = function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    },

    // a classic iterator
    each: function (callback) {
        var cb = this.lambda(callback)
        // iterate from chain
        if (this.__results) {
            for (var i = 0, l = this.__results.length; i < l; i++) cb.call(this, this.__results[i], i)
        }
        // otherwise iterate the entire collection 
        else {
            this.all(function (r) {
                for (var i = 0, l = r.length; i < l; i++) cb.call(this, r[i], i)
            })
        }
        return this
    }
// --
};


function isChromeApp() {
    return (typeof chrome !== "undefined" &&
        typeof chrome.storage !== "undefined" &&
        typeof chrome.storage.local !== "undefined");
}


/**
 * chrome.storage storage adapter
 * ===
 * - originally authored by Joseph Pecoraro
 *
 */
//
// Oh, what a tangled web we weave when a callback is what we use to receive - jrschifa
//
Lawnchair.adapter('chrome-storage', (function () {



    var storage;
    if (isChromeApp()) {
        storage = chrome.storage.local
    }

    var indexer = function (name) {
        return {
            // the key
            key: name + '._index_',
            // returns the index
            all: function (callback) {
                var _this = this

                var initStorage = function () {
                    var obj = JSON.stringify([])
                    var _set = {}
                    _set[_this.key] = obj
                    storage.set(_set)

                    obj = JSON.parse(obj)

                    return obj
                }

                storage.get(this.key, function (items) {
                    var obj
                    if (Object.keys(items).length > 0) {
                        for (itemKey in items) {
                            obj = items[itemKey]
                            if (obj) {
                                obj = JSON.parse(obj)
                            }

                            if (obj === null || typeof obj === 'undefined') {
                                obj = initStorage()
                            }

                            if (callback) {
                                callback(obj)
                            }
                        }
                    } else {
                        obj = initStorage()
                        callback(obj)
                    }
                })
            },
            // adds a key to the index
            add: function (key) {
                this.all(function (a) {
                    a.push(key)

                    var _set = {}
                    _set[this.key] = JSON.stringify(a)
                    storage.set(_set)
                })
            },
            // deletes a key from the index
            del: function (key) {
                var r = []
                this.all(function (a) {
                    for (var i = 0, l = a.length; i < l; i++) {
                        if (a[i] != key) r.push(a[i])
                    }

                    var _set = {}
                    _set[this.key] = JSON.stringify(r)
                    storage.set(_set)
                })
            },
            // returns index for a key
            find: function (key, callback) {
                this.all(function (a) {
                    for (var i = 0, l = a.length; i < l; i++) {
                        if (key === a[i]) {
                            if (callback) callback(i)
                        }
                    }

                    if (callback) callback(false)
                })
            }
        }
    }

    // adapter api 
    return {

        // ensure we are in an env with chrome.storage 
        valid: function () {
            return !!storage && function () {
                // in mobile safari if safe browsing is enabled, window.storage
                // is defined but setItem calls throw exceptions.
                var success = true
                var value = Math.random()
                value = "" + value + "" //ensure that we are dealing with a string
                try {
                    var _set = {}
                    _set[value] = value;
                    storage.set(_set)
                } catch (e) {
                    success = false
                }
                storage.remove(value)
                return success
            }()
        },

        init: function (options, callback) {
            this.indexer = indexer(this.name)
            if (callback) this.fn(this.name, callback).call(this, this)
        },

        save: function (obj, callback) {
            var key = obj.key ? this.name + '.' + obj.key : this.name + '.' + this.uuid()
            // if the key is not in the index push it on
            if (this.indexer.find(key) === false) this.indexer.add(key)
            // now we kil the key and use it in the store colleciton    
            delete obj.key;
            var _set = {}
            _set[key] = JSON.stringify(obj)
            storage.set(_set)
            obj.key = key.slice(this.name.length + 1)
            if (callback) {
                this.lambda(callback).call(this, obj)
            }
            return this
        },

        batch: function (ary, callback) {
            var saved = []
            // not particularily efficient but this is more for sqlite situations
            for (var i = 0, l = ary.length; i < l; i++) {
                this.save(ary[i], function (r) {
                    saved.push(r)
                })
            }
            if (callback) this.lambda(callback).call(this, saved)
            return this
        },

        // accepts [options], callback
        keys: function (callback) {
            if (callback) {
                var _this = this
                var name = this.name
                var keys

                this.indexer.all(function (data) {
                    keys = data.map(function (r) {
                        return r.replace(name + '.', '')
                    })

                    _this.fn('keys', callback).call(_this, keys)
                })
            }
            return this
        },

        get: function (key, callback) {
            var _this = this
            var obj

            if (this.isArray(key)) {
                var r = []
                for (var i = 0, l = key.length; i < l; i++) {
                    var k = this.name + '.' + key[i]

                    storage.get(k, function (items) {
                        if (items) {
                            for (itemKey in items) {
                                obj = items[itemKey]
                                obj = JSON.parse(obj)
                                obj.key = itemKey.replace(_this.name + '.', '')
                                r.push(obj)
                            }
                        }

                        if (i == l) {
                            if (callback) _this.lambda(callback).call(_this, r)
                        }
                    })
                }
            } else {
                var k = this.name + '.' + key

                storage.get(k, function (items) {
                    if (items) {
                        for (itemKey in items) {
                            obj = items[itemKey]
                            obj = JSON.parse(obj)
                            obj.key = itemKey.replace(_this.name + '.', '')
                        }
                    }
                    if (callback) _this.lambda(callback).call(_this, obj)
                })
            }
            return this
        },

        exists: function (key, callback) {
            var _this = this
            this.indexer.find((this.name + '.' + key), function (response) {
                response = (response === false) ? false : true;
                _this.lambda(callback).call(_this, response)
            })

            return this;
        },
        // NOTE adapters cannot set this.__results but plugins do
        // this probably should be reviewed
        all: function (callback) {
            var _this = this

            this.indexer.all(function (idx) {
                //console.log('adapter all');
                //console.log(idx);
                var r = []
                    , o
                    , k

                //console.log(idx);
                if (idx.length > 0) {
                    for (var i = 0, l = idx.length; i < l; i++) {
                        storage.get(idx[i], function (items) {
                            for (k in items) {
                                o = JSON.parse(items[k])
                                o.key = k.replace(_this.name + '.', '')
                                r.push(o)
                            }

                            if (i == l) {
                                if (callback) _this.fn(_this.name, callback).call(_this, r)
                            }
                        })
                    }
                } else {
                    if (callback) _this.fn(_this.name, callback).call(_this, r)
                }
            })
            return this
        },

        remove: function (keyOrObj, callback) {
            var key = this.name + '.' + ((keyOrObj.key) ? keyOrObj.key : keyOrObj)
            this.indexer.del(key)
            storage.remove(key)
            if (callback) this.lambda(callback).call(this)
            return this
        },

        nuke: function (callback) {
            //could probably just use storage.clear() hear
            this.all(function (r) {
                for (var i = 0, l = r.length; i < l; i++) {
                    r[i] = "" + r[i] + ""
                    this.remove(r[i]);
                }
                if (callback) this.lambda(callback).call(this)
            })
            return this
        }
    }
})());


/**
 * dom storage adapter
 * ===
 * - originally authored by Joseph Pecoraro
 *
 */
//
// TODO does it make sense to be chainable all over the place?
// chainable: nuke, remove, all, get, save, all    
// not chainable: valid, keys
//
Lawnchair.adapter('dom', (function () {
    var storage;
    if (!isChromeApp()) {
        storage = window.localStorage;
    }
    // the indexer is an encapsulation of the helpers needed to keep an ordered index of the keys
    var indexer = function (name) {
        return {
            // the key
            key: name + '._index_',
            // returns the index
            all: function () {
                var a = storage.getItem(JSON.stringify(this.key))
                if (a) {
                    a = JSON.parse(a)
                }
                if (a === null) storage.setItem(JSON.stringify(this.key), JSON.stringify([])) // lazy init
                return JSON.parse(storage.getItem(JSON.stringify(this.key)))
            },
            // adds a key to the index
            add: function (key) {
                var a = this.all()
                a.push(key)
                storage.setItem(JSON.stringify(this.key), JSON.stringify(a))
            },
            // deletes a key from the index
            del: function (key) {
                var a = this.all(), r = []
                // FIXME this is crazy inefficient but I'm in a strata meeting and half concentrating
                for (var i = 0, l = a.length; i < l; i++) {
                    if (a[i] != key) r.push(a[i])
                }
                storage.setItem(JSON.stringify(this.key), JSON.stringify(r))
            },
            // returns index for a key
            find: function (key) {
                var a = this.all()
                for (var i = 0, l = a.length; i < l; i++) {
                    if (key === a[i]) return i
                }
                return false
            }
        }
    }

    // adapter api 
    return {

        // ensure we are in an env with localStorage 
        valid: function () {
            return !!storage && function () {
                // in mobile safari if safe browsing is enabled, window.storage
                // is defined but setItem calls throw exceptions.
                var success = true
                var value = Math.random()
                try {
                    storage.setItem(value, value)
                } catch (e) {
                    success = false
                }
                storage.removeItem(value)
                return success
            }()
        },

        init: function (options, callback) {
            this.indexer = indexer(this.name)
            if (callback) this.fn(this.name, callback).call(this, this)
        },

        save: function (obj, callback) {
            var key = obj.key ? this.name + '.' + obj.key : this.name + '.' + this.uuid()
            // now we kil the key and use it in the store colleciton    
            delete obj.key;
            storage.setItem(key, JSON.stringify(obj))
            // if the key is not in the index push it on
            if (this.indexer.find(key) === false) this.indexer.add(key)
            obj.key = key.slice(this.name.length + 1)
            if (callback) {
                this.lambda(callback).call(this, obj)
            }
            return this
        },

        batch: function (ary, callback) {
            var saved = []
            // not particularily efficient but this is more for sqlite situations
            for (var i = 0, l = ary.length; i < l; i++) {
                this.save(ary[i], function (r) {
                    saved.push(r)
                })
            }
            if (callback) this.lambda(callback).call(this, saved)
            return this
        },

        // accepts [options], callback
        keys: function (callback) {
            if (callback) {
                var name = this.name
                var indices = this.indexer.all();
                var keys = [];
                //Checking for the support of map.
                if (Array.prototype.map) {
                    keys = indices.map(function (r) {
                        return r.replace(name + '.', '')
                    })
                } else {
                    for (var key in indices) {
                        keys.push(key.replace(name + '.', ''));
                    }
                }
                this.fn('keys', callback).call(this, keys)
            }
            return this // TODO options for limit/offset, return promise
        },

        get: function (key, callback) {
            if (this.isArray(key)) {
                var r = []
                for (var i = 0, l = key.length; i < l; i++) {
                    var k = this.name + '.' + key[i]
                    var obj = storage.getItem(k)
                    if (obj) {
                        obj = JSON.parse(obj)
                        obj.key = key[i]
                    }
                    r.push(obj)
                }
                if (callback) this.lambda(callback).call(this, r)
            } else {
                var k = this.name + '.' + key
                var obj = storage.getItem(k)
                if (obj) {
                    obj = JSON.parse(obj)
                    obj.key = key
                }
                if (callback) this.lambda(callback).call(this, obj)
            }
            return this
        },

        exists: function (key, cb) {
            var exists = this.indexer.find(this.name + '.' + key) === false ? false : true;
            this.lambda(cb).call(this, exists);
            return this;
        },
        // NOTE adapters cannot set this.__results but plugins do
        // this probably should be reviewed
        all: function (callback) {
            var idx = this.indexer.all()
                , r = []
                , o
                , k
            for (var i = 0, l = idx.length; i < l; i++) {
                k = idx[i] //v
                o = JSON.parse(storage.getItem(k))
                o.key = k.replace(this.name + '.', '')
                r.push(o)
            }
            if (callback) this.fn(this.name, callback).call(this, r)
            return this
        },

        remove: function (keyOrArray, callback) {
            var self = this;
            if (this.isArray(keyOrArray)) {
                // batch remove
                var i, done = keyOrArray.length;
                var removeOne = function (i) {
                    self.remove(keyOrArray[i], function () {
                        if ((--done) > 0) {
                            return;
                        }
                        if (callback) {
                            self.lambda(callback).call(self);
                        }
                    });
                };
                for (i = 0; i < keyOrArray.length; i++)
                    removeOne(i);
                return this;
            }
            var key = this.name + '.' +
                ((keyOrArray.key) ? keyOrArray.key : keyOrArray)
            this.indexer.del(key)
            storage.removeItem(key)
            if (callback) this.lambda(callback).call(this)
            return this
        },

        nuke: function (callback) {
            this.all(function (r) {
                for (var i = 0, l = r.length; i < l; i++) {
                    this.remove(r[i]);
                }
                if (callback) this.lambda(callback).call(this)
            })
            return this
        }
    }
})());
