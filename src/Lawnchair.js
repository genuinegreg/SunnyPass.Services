'use strict';

/**
 * Lawnchair wrapper
 */
angular.module('Lawnchair', [])
    .service('Lawnchair', function LawnchairSercice($q, $log) {

        var _this = this;

        _this.lawnchair = new Lawnchair(function () {
        });

        _this.get = function (key) {
            var d = $q.defer();

            _this.lawnchair.get(
                key,
                function (item) {
                    if (!item) {
                        d.reject();
                        return;
                    }

                    d.resolve(item.value);
                }

            );

            return d.promise;
        }

        _this.keys = function () {
            var d = $q.defer();

            _this.lawnchair.keys(
                d.resolve
            )

            return d.promise;
        }

        _this.save = function (key, value) {
            var d = $q.defer();

            $log.debug('save');

            _this.lawnchair.save(
                {key: key, value: value},
                d.resolve

            );

            return d.promise;
        }

        _this.remove = function (key) {
            var d = $q.defer();

            _this.lawnchair.remove(
                key,
                d.resolve
            )


            return d.promise;
        }

        _this.nuke = function () {
            var d = $q.defer();

            console.log('yo', _this);

            _this.lawnchair.nuke(
                d.resolve
            );

            return d.promise;

        }

    });
