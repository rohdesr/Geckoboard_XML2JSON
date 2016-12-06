var API_KEY = '';
var http = require('http');
var parseString = require('xml2js').parseString;
var gb = require('geckoboard')(API_KEY);
var _ = require('lodash');
var json;
var data = [];

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
      console.log(JSON.stringify(result));
      json = result;
    });
  });

  req.on('error', function(err) {
      // debug error
  });
})

gb.datasets.findOrCreate(
  {
    id: 'xml.rates',
    fields: {
      symbol: {
        type: 'string',
        name: 'Symbol'
      },
      bid: {
        type: 'number',
        name: 'Bid' 
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
     data[key]['bid'] = parseInt(value['Bid'][0], 10);
     // The data var looks like this: [{'symbol': 'EURUSD', 'bid': '1:'}]
   });
   
   dataset.put(
    data,
    function (err) {
      if (err) {
        console.error(err);
        return;
      }
        console.log('Dataset created and data added');
      }
   )    
})
