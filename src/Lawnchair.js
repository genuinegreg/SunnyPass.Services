'use strict';

/**
 * Lawnchair wrapper
 */
angular.module('SunnyPass.Crypto', [])
    .service('Lawnchair', function Lawnchair($q) {

        this.lawnchair = new Lawnchair();

        this.get = function (key) {
            var d = $q.defer();

            this.lawnchair.get(key, function (value) {
                if (!value) {
                    d.reject('no value');
                    return;
                }

                d.resolve(value);
            });

            return d.promise;
        }

        this.keys = function () {
            var d = $q.defer();

            this.lawnchair.keys(function (keys) {
                if (!keys) {
                    d.reject('keys is falsy');
                    return;
                }

                d.resolve(keys);
            })

            return d.promise;
        }

        this.save = function (key, value) {
            var d = $q.defer();

            this.lawnchair.save({key: key, options: value}, function (obj) {
                d.resolve();
            })

            return d.promise;
        }

    });
