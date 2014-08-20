// NOte:
// Tried to use node-parse-api node package but it was shite for query params
// (crucial for us), so using request insted and building myself
var request     = require('request'),
    querystring = require('querystring');

// Parse.com API configs
var API_CONFIG  = {
    dev : {
        appId     : 'ommitted for RJMetrics debug purposes',
        apiKey    : 'ommitted for RJMetrics debug purposes',
        masterKey : 'ommitted for RJMetrics debug purposes'
    },
    prod : {
        appId     : 'ommitted for RJMetrics debug purposes',
        apiKey    : 'ommitted for RJMetrics debug purposes',
        masterKey : 'ommitted for RJMetrics debug purposes'
    },
    baseUrl : 'https://api.parse.com/1'
};

var makeRequestOptions = function(classFetchConfig, targetDB){
    var classPrefix;

    switch(classFetchConfig.className){
         case  'users' :
         case  'installations' :
             classPrefix = '';
             break;
         default :
             classPrefix = '/classes';
    }

    return {
        url     : API_CONFIG.baseUrl + classPrefix +
                '/' + classFetchConfig.className +
                '?' + querystring.stringify(classFetchConfig.queryParams),
        headers : {
            'X-Parse-Application-Id' : API_CONFIG[targetDB].appId,
            'X-Parse-REST-API-Key'   : API_CONFIG[targetDB].apiKey,
            'X-Parse-Master-Key'     : API_CONFIG[targetDB].masterKey
        }
    };
};

var fetchClass = function(classFetchConfig, targetDb, callback){
    var requestOptions = makeRequestOptions(classFetchConfig, targetDb);
    console.log('Parse.com: calling ' + requestOptions.url);

    // Fake instances for RJMetrics debug process
    var fakeInstances = [];
    for (var i = 0; i < classFetchConfig.queryParams.limit; i++) {
        fakeInstances.push(new classFetchConfig.testClass('Test promise #'+(i+1)));
    };

    // Fake successful parse.com response for RJMetrics debug purposes
    callback(
        null,
        {statusCode: 200},
        JSON.stringify({results: fakeInstances}),
        {className : classFetchConfig.className, primaryKeys : classFetchConfig.primaryKeys}
    );

    // request(requestOptions, function(error, response, body){
    //     callback(error, response, body, {className : classFetchConfig.className, primaryKeys : classFetchConfig.primaryKeys});
    // });
};

// Public face of module
module.exports = {
    fetchClasses : function(classes, targetDb, callback){
        classes.forEach(function(classFetchConfig){
            fetchClass(classFetchConfig, targetDb, callback);
        });
    }
};