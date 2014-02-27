// Karma configuration
// Generated on Wed Jan 29 2014 17:23:26 GMT+0100 (CET)

module.exports = function(config) {
    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: '',


        // frameworks to use
        frameworks: ['jasmine'],


        // list of files / patterns to load in the browser
        files: [
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'bower_components/angular-cache/dist/angular-cache.js',
            'bower_components/async/lib/async.js',
            'bower_components/crypto-js/rollups/aes.js',
            'bower_components/crypto-js/rollups/sha3.js',
            'bower_components/crypto-js/rollups/pbkdf2.js',
            'bower_components/crypto-js/components/core-min.js',
            'bower_components/crypto-js/components/enc-base64.js',
            'bower_components/es5-shim/es5-shim.js',
            'bower_components/json3/lib/json3.js',
            'bower_components/pouchdb/dist/pouchdb-nightly.js',
            'src/**/*.js',
            'tests/**/*.js'
        ],


        // list of files to exclude
        exclude: [

        ],


        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera (has to be installed with `npm install karma-opera-launcher`)
        // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
        // - PhantomJS
        // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
        browsers: ['PhantomJS'],


        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,


        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: true
    });
};
