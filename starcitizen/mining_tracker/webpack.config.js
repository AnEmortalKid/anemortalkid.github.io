const path = require('path');

module.exports = {
mode: 'development',
// optimization: {
//     // We no not want to minimize our code.
//     minimize: false
//   },  
entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'app'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
