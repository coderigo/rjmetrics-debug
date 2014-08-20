var rjmetrics            = require('rjmetrics'),
    RJMETRICS_CONFIG     = require('./rjmetrics.config'),
    client               = new rjmetrics.Client(RJMETRICS_CONFIG.clientId, RJMETRICS_CONFIG.apiKey),
    _                    = require('underscore'),
    async                = require('async'),
    request              = require('request'),
    elapse               = require('elapse');

var rjmetricsUrl = function(tableName, useDevDb){
    var protocol = 'https://',
        base     = useDevDb ? 'sandbox-connect.rjmetrics.com' : 'connect.rjmetrics.com',
        base2    = '/v2/client/2948/table/' + tableName + '/data?apikey=e98dacebeef8c19665cbdf19f72ccc28';

    return protocol + base + base2;
};

var synchInstance = function(className, primaryKeys, instance, useDevDb){
    instance.keys = primaryKeys; // This is what RJMetrics needs
    return useDevDb ? client.pushData(className, instance, client.SANDBOX_BASE) : client.pushData(className, instance); // A promise
};

var logSynchAttempt = function(synchLog, sourceName, className, primaryKey, failed){
    synchLog[sourceName][className].totalCount++;
    synchLog[sourceName][className].recentCount++;
    synchLog[sourceName][className].attempted.push(primaryKey);
    if(failed){
        synchLog[sourceName][className].failed.push(primaryKey);
    }
};

var keyifyInstances = function(instances, primaryKeys){
    _.map(instances, function(instance){
        instance.keys = primaryKeys;
    });
};

var chunkInstances = function(chunkSize, instances, className, useDevDb){
    // Ref: http://stackoverflow.com/questions/8566667/split-javascript-array-in-chunks-using-underscore-js
    var chunks = _.chain(instances).groupBy(function(element, index){
      return Math.floor(index/chunkSize);
    })
    .toArray()
    .value();

    // Make them into async functions
    _.map(chunks, function(chunk, chunkIndex){
        chunks[chunkIndex] = function(asyncCallback){

            var postConfig = {
                url    : rjmetricsUrl(className, useDevDb),
                body   : chunk,
                method : 'POST',
                json   : true
            };

            console.log('Firing ', className, ' upsert request index (chunk #): ', chunkIndex + 1);
            request(postConfig, function(error, response, body){

                var requestResult = {
                    className : className,
                    index     : chunkIndex + 1,
                    response  : response,
                    body      : body,
                    error     : error
                };

                asyncCallback(error, requestResult);
            });
        };
    });

    return chunks;
};

module.exports = {
    synchClass : function(className, primaryKeys, instances, useDevDb, sourceName, synchLog, callback){
        console.log('RJMetrics: Synching ' + instances.length + ' instances of ' + className + '.');
        client
            .authenticate()
            .then(function(data){
                instances.forEach(function(instance){
                    // sleep(1);
                    synchInstance(className, primaryKeys, instance, useDevDb).then(
                        function(data){ // Promise success
                            var recordId = instance[primaryKeys[0]];
                            logSynchAttempt(synchLog, sourceName, className, recordId, false);
                            console.log('RJMetrics: Synched instance ' + synchLog[sourceName][className].recentCount + ' of ' + className + ' with primaryKey = ' + recordId);
                            callback(synchLog);
                        },
                        function(error){ // Promise failure
                            var recordId = instance[primaryKeys[0]];
                            logSynchAttempt(synchLog, sourceName, className, recordId, true);
                            console.error('RJMetrics: Failed to synch instance ' + synchLog[sourceName][className].recentCount + ' of ' + className + ' with primaryKey = ' + recordId, error);
                            callback(synchLog);
                        }
                    );
                });
            })
            .fail(function(error){
                console.error('RJMetrics: Failed to authenticate!');
            });
    },
    synchClassBatch : function(className, primaryKeys, instances, useDevDb, sourceName){

        elapse.time(className);

        var headTailMessage = instances.length + ' ' + className + ' records.';

        console.log('Synching', headTailMessage);

        // Inject primary keys property into every instance
        keyifyInstances(instances, primaryKeys);

        // Split instances into arrays of 100 at a time to feed the rjmetrics API
        var instanceChunks = chunkInstances(100, instances, className, useDevDb);

        // Do a sequential push of each instance to RJ and fire off result callback on end of series
        async.series(instanceChunks, function(error, results){
            var totalMins = Math.floor((elapse.timeEnd(className)/1000)/60);

            console.log('Fininshed synching', headTailMessage, 'in ' + totalMins + 'mins');

            var failed = _.filter(results, function(result){ result.response.statusCode != 201});

            console.log('\tFailed (', failed.length, ') : ', failed);
        });
    }
};