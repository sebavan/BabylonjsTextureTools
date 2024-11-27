const { merge } = require('webpack-merge');
const ESLintPlugin = require('eslint-webpack-plugin');
const common = require('./webpack.common.js');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, "./www");

module.exports = merge(common, {
    output: {
        path: DIST_DIR + "/scripts/",
    },
    mode: 'production',
    devtool: false,
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: ["ts-loader"],
        }]
    },
    plugins: [new ESLintPlugin()],
});