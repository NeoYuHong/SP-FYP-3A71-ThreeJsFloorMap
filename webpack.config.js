const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: './src/index.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		chunkFilename: '[id].[chunkhash].js'
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: 'src/index.html'
		})
	],
	devServer: {
		open: true
	},
	optimization: {
		runtimeChunk: true,
		splitChunks: {
			chunks: 'all'
		}
	},
	module: {
		rules: [

			{
				test: /\.(png|jpe?g|gif)$/i,
				type: 'asset/resource'
			},
			{
				test: /\.glb$/,
				type: 'asset/resource',
				generator: {
					filename: 'models/[name][ext]'
				}
			},
			{
				test: /\.(exr|hdr)$/,
				type: 'asset/resource',
				generator: {
					filename: '[name][ext]'
				}
			}
		]
	}
};