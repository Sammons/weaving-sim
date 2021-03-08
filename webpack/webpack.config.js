const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, '../docs')
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ]
      },
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  plugins: [
    new CopyPlugin({patterns: [{from: "static/index.html"}, {from: "static/pure.css"}]})
  ],
};