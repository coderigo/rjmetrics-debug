var vinusParse     = require('./lib/parse.com.js'),
    vinusRJMetrics = require('./lib/rjmetrics-client'),
    synchLogPath   = './synched_log.json',
    synchLog       = require(synchLogPath),
    _              = require('underscore'),
    fs             = require('fs');

// Settings for fetching/pushing data
var synchConfig = {
    // Configs for fetching
    fetch : {
        parse : { // Parse.com configs
            targetDb : 'dev', // either 'dev' or 'prod'
        }
    },
    // Configs for pushing to RJMetrics
    push : {
        useDevDb : true
    },
    log : synchLog
};

/**
 * This is to use parse.com data dumps of ALL your data and push it in chunks of 100 records
 * at a time to RJMetrics : =D
 * Once this big push is done, incremental pushes should be much, much smaller and simpler. It would hinge on
 * being able to query RJmetrics's data to be able to tell what record you're up to. Alternatively, one could
 * set up a nightly "synch" to RJMetrics that would overwrite the entire data so that all records are up to
 * date and new ones are included. Seems inefficient but simpler to implement (basically runn this script)
 * Nightly.
 */

var parseDumps = {
    filesPath   : './data/parse.com/',
    // importFiles : ['_User', 'Activity', 'FacebookInvite', 'Order', 'Post', 'Wine', '_Installation']
    importFiles : ['_User']
};

var TestUser = function(objectId){
    return {
        "createdAt"    : "someTime",
        "email"        : "test@gmail.com",
        "objectId"     : objectId.toString(),
        "signupsource" : "Account",
        "updatedAt"    : "someTime",
        "username"     : "test@gmail.com"
    };
};

// Uses synchClassBatch - This works.
// Grabs a bunch of class instances, chunks them and sends to RJMetrics
parseDumps.importFiles.forEach(function(fileName){

    var className = fileName.replace('_',''),
        // instances = require(parseDumps.filesPath + fileName + '.json').results;
        instances = [];
        for (var i = 1; i <= 500; i++) { // Expect 5 chunks = 500/100
            instances.push(new TestUser(i));
        };

    vinusRJMetrics.synchClassBatch(className, ['objectId'], instances, synchConfig.push.useDevDb, 'parse');
});

/**
 * The below is to more or less manually fetch classes from parse and then push to RJ Metrics
 * Ignoring for now for us.
 * This is where we get the RJMetrics promise failure (firing requests in quick promise succession)
 */

// Array of class queries to fetch from parse.com
synchConfig.fetch.parse.classes = [
    {
        className   : 'users',
        queryParams : { limit : 100 , skip : synchConfig.log.parse['users'].totalCount },
        primaryKeys : ['objectId'],
        testClass   : TestUser
    }
];

// Uses synchClass - This fails.
// Start fetching stuff from Parse and then push to RJMetrics (only vinusParsefor now)
// vinusParse.fetchClasses(
//     synchConfig.fetch.parse.classes, 
//     synchConfig.fetch.parse.targetDb, 
//     function(error, response, body, fetchParams){

//         if(!error && response.statusCode === 200){

//             var instances = JSON.parse(body).results;

//             console.log('Parse.com: Fetched ' + instances.length + ' instances of ' + fetchParams.className + ' from Parse.');

//             // Feed the users through to rjmetrics
//             vinusRJMetrics
//                 .synchClass(
//                     fetchParams.className,
//                     fetchParams.primaryKeys,
//                     instances,
//                     synchConfig.push.useDevDb,
//                     'parse',
//                     synchConfig.log,
//                     function(synchLog){}
//                 );

//         }
//         else {
//             console.error('Parse.com: Failed to fetch from Parse with status : ' + response.statusCode);
//         }
//     }
// );