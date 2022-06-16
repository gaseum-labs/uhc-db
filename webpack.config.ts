import * as path from 'path';
import * as webpack from 'webpack';
const webpackNodeExternals = require('webpack-node-externals');

const clientConfig: webpack.Configuration = {
	mode: 'development',
	entry: {
		home: './src/client/home.tsx',
		expired: './src/client/expired.tsx',
		games: './src/client/games.tsx',
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'static'),
	},
	resolve: {
		extensions: ['.js', '.ts', '.tsx'],
	},
	target: ['web', 'es2020'],
};

const serverConfig: webpack.Configuration = {
	mode: 'development',
	entry: {
		init: './src/server/init.ts',
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'app'),
	},
	resolve: {
		extensions: ['.js', '.ts', '.tsx'],
	},
	externals: [webpackNodeExternals()],
	devtool: 'source-map',
	target: 'node',
};

module.exports = [clientConfig, serverConfig];
