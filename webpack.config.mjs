import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';

export default {
  entry: './src/index.js', // Entry point to your application
  output: {
    filename: 'bundle.js',
    path: path.resolve('dist'), // Output directory for the bundled files
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Apply this rule to JavaScript files
        exclude: /node_modules/, // Exclude the node_modules directory
        use: 'babel-loader', // Use Babel loader for transpiling ES6+ code
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Ensure this path is correct
      filename: 'index.html', // Output HTML file name
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve('dist'), // Directory to serve static files from
    },
    port: 9000, // Port for the development server
    open: true, // Automatically open the browser when the server starts
  },
};
