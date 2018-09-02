'use strict';

const fetch = require('node-fetch');

exports.densityClustering = (dataset) => {
  return fetch('https://4hzkm7rsdc.execute-api.us-east-1.amazonaws.com/Development/DensityBasedClustering', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      min: 2,
      radius: 0.001,
      dataset: dataset
    })
  });
}