const path = require("path");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const SRC_DIR = path.resolve(__dirname, "./src");

module.exports = {
    context: __dirname,
    entry: {
        index: SRC_DIR + "/app.ts"
    },
    output: {
        publicPath: "scripts/",
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    module: {
        rules: [
        {
            test: /\.(glsl)$/i,
            use: ["raw-loader"]
        }]
    },
    plugins: [
        new CleanWebpackPlugin()
    ]
};