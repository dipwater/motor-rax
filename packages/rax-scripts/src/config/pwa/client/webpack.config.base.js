'use strict';

const qs = require('querystring');
const webpackMerge = require('webpack-merge');

const ssrWebpackPlugin = require.resolve('rax-ssr-webpack-plugin');
const webpackConfigBase = require('../webpack.config.base');
const getEntries = require('../../../utils/getPWAEntries');

let entry = {};
const entries = getEntries();
Object.keys(entries).forEach((key) => {
  // TODO: read config file set ssr value
  entry[key] = `${ssrWebpackPlugin.entryLoader}?${qs.stringify({ ssr: true })}!${entries[key]}`;
});

const webpackConfig = webpackMerge(webpackConfigBase, {
  target: 'web',
  entry,
  output: {
    filename: 'client/[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        enforce: 'pre',
        use: [
          {
            loader: require.resolve('rax-webpack-plugin/lib/PlatformLoader'),
            options: {
              platform: 'web'
            }
          },
        ],
      }
    ]
  }
});

module.exports = webpackConfig;