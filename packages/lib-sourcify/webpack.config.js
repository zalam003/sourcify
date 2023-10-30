const path = require('path');

module.exports = {
  entry: './build/module/index.js', // starting point of your library
  output: {
    path: path.resolve(__dirname, 'dist'), // where the bundle will be saved
    filename: 'lib-sourcify.js', // name of the bundled file
    library: 'LibSourcify', // name of the global variable when used in the browser
    libraryTarget: 'umd', // supports commonjs, amd and as globals
    umdNamedDefine: true, // uses human-readable names
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
