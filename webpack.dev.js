const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

const DEV_DIR = path.resolve(__dirname, "./.temp");

module.exports = merge(common, {
    output: {
        path: DEV_DIR + "/scripts/",
        publicPath: "/scripts/",
    },
    mode: 'development',
    devtool: "source-map",
    devServer: {
        static: ['www'],
        compress: true,
        hot: true,
        // host: '0.0.0.0', // enable to access from other devices on the network
        // https: true // enable when HTTPS is needed
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: ["ts-loader"],
        }]
    },
});