const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, "./www");

module.exports = merge(common, {
    output: {
        path: DIST_DIR + "/scripts/",
    },
    mode: 'production',
    devtool: "none",
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: ["ts-loader", "eslint-loader"],
        }]
    },
});