This is intended as a quick debugging example for RJMetrics.

### Running

`npm install`

`node main.js`

It is set up to hit the RJMetrics sandbox endpoint.

**Important! :** This already fakes responses from Parse.com and omits any of our API Keys. You must also fill in the two properties in `lib/rjmetrics.config.json` with your own values to test it as we've excluded our own in order to put on Github.

### Notes

`main.js` simply calls Parse.com records (called `instances` in the code) from tables (called `Classes` in the code) and upon receipt, inserts a `keys` property into each record before pushing to RJMetrics.

The module `lib/rjmetrics-client.js` exports two methods:

1. **synchClass**: This is intended for synching (to RJMetrics) individual instances of a class, pretty much swiped from the RJMetrics [docs](http://developers.rjmetrics.com/getting_started.html). This is where we see the errors after about the 10th promise. **This fails. To reproduce, uncomment lines `82-109` in `main.js`**


1. **synchClassBatch**: This is intended for synching (to RJMetrics) an array of instances of a class. It essentially takes the `instances` array, chunks it into an array of arrays with each array containing at most 100 instances (an RJMetrics limit for upserts per request). It also bypasses RJMetrics's client, using instead the [request](https://github.com/mikeal/request) library to build requests to the RJMetrics and firing them off sequentially using [async](https://github.com/caolan/async). This is the only way I was able to upload 1000s of records to the RJMetrics DB. **This works. To reproduce, uncomment lines `52-62` in `main.js`**