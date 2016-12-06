var API_KEY = '446a0261034b415864481e8f320b1045';
var http = require('http');
var parseString = require('xml2js').parseString;
const cron = require('node-cron');
var gb = require('geckoboard')(API_KEY);
var _ = require('lodash');
var json;
var data = [];

var datasetName = 'xml.rates';


//timestamp stuff
var timeStamp = new Date();
var localDate = timeStamp.toDateString();
var localUTCOffset = timeStamp.getTimezoneOffset()/60;



// run app every 10 minutes
cron.schedule('*/10 * * * *', function(){  
 	console.log(new Date().toISOString() + ': requesting new exchange rate data...');

// Makes request to XML page
var req = http.get('http://rates.fxcm.com/RatesXML', function(res) {
  var xml = '';
  res.on('data', function(chunk) {
    xml += chunk;
  });

  // Converts XML response to JSON object.
  // Output looks like this:
  // {"Rates":{"Rate":[
  // {"$":{"Symbol":"EURUSD"},
  //  "Bid":["1.07599"],
  //  "Ask":["1.07624"],
  //  "High":["1.07713"],
  //  "Low":["1.07491"],
  //  "Direction":["1"],
  //  "Last":["22:36:48"]},..}]}
  res.on('end', function() {
    parseString(xml, function (err, result) {
//      console.log(JSON.stringify(result));
      json = result;
    });
  });

  req.on('error', function(err) {
      // debug error
  });
})

gb.datasets.findOrCreate(
  {
    id: datasetName,
    fields: {
      symbol: {
        type: 'string',
        name: 'Symbol'
      },
      bid: {
        type: 'number',
        name: 'Bid' 
      },
      timestamp: {
        type: 'datetime',
        name: 'Datetime' 
      }
    },
  },
  function (err, dataset) {
    if (err) {
     console.error(err);
     return;
   }
    
   _.forEach(json['Rates']['Rate'], function(value, key) {  
     data[key] = {};
     // Add symbol, e.g., EURUSD, as an object in an array.
     data[key]['symbol'] = value['$']['Symbol'];
     data[key]['bid'] = parseFloat(value['Bid'][0]);
     data[key]['timestamp'] = new Date(localDate + " " + value['Last'] + ' ' + localUTCOffset).toISOString();
	 // console.log('SYMBOL:'+ data[key]['symbol'] + '    BID:'+ data[key]['bid'] + '   TIMESTAMP:'+ data[key]['timestamp']);
     // The data var looks like this: [{'symbol': 'EURUSD', 'bid': '1:'. 'timestamp': '2016-12-06T14:50:00.000Z'}]
   });
   
  dataset.post(
    data,
	{delete_by: 'timestamp'},
    function (err) {
      if (err) {
        console.error(err);
        return;
     }
        console.log('SUCCESS: '+ datasetName +' updated with exchangerate data reported at '+  new Date().toISOString());
      }
   );    
});
});
