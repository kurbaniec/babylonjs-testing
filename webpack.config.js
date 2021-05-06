const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const appDirectory = fs.realpathSync(process.cwd());

// Clean is done now via Webpack
// See: https://github.com/johnagan/clean-webpack-plugin/issues/194#issuecomment-781517478

module.exports = {
    entry: path.resolve(appDirectory, "src/app.ts"), //path to the main .ts file
    output: {
        filename: "js/bundleName.js", //name for the js file that is created/compiled in memory
        clean: true
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    devtool: 'source-map',
    devServer: {
        host: "0.0.0.0",
        port: 8080, //port that we're using for local host (localhost:8080)
        disableHostCheck: true,
        contentBase: path.resolve(appDirectory, "public"), //tells webpack to serve from the public folder
        publicPath: "/",
        hot: true
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            template: path.resolve(appDirectory, "public/index.html"),
        }),
        new CopyPlugin({
            patterns: [
                {from: "textures", to: "textures"},
            ],
        })
    ],
    mode: "development",
};
