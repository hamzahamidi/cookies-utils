const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  devtool: 'source-map',
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.ProgressPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'src', to: 'src' },
        { from: 'package.json' },
        { from: 'README.md' }
      ],
    }),
  ],
  output: {
    filename: 'cookies-utils.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'cookiesUtils',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader',
        include: [path.resolve(__dirname, 'src')],
        exclude: [/node_modules/]
      },
      {
        test: /\.m?js$/,
        exclude: [/node_modules/],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }]
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  }
}