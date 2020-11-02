const { merge } = require('webpack-merge');

const config = require('./webpack.config');

module.exports = function () {
  return merge(config, {
    mode: 'production',
    devtool: 'source-map'
  })
};