const path = require('path')
const webpack = require('webpack')
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

const fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function (x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function (mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

const plugins = [
    new webpack.DefinePlugin({
        'process.env': {
            NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            LAYER: JSON.stringify(process.env.LAYER),
            SERVER_PORT: '3000',
            SERVER_HOST: "'localhost'"
        }
    })
]
if (process.env.ANALYZE === "true") {
    plugins.push(new BundleAnalyzerPlugin())
}

module.exports = {
    externals: nodeModules,
    target: 'node',
    entry: {
        [process.env.LAYER]: './src/index.ts'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                options: {
                    useBabel: true
                }
            },
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
        alias: {
            "@": path.resolve(__dirname, "src"),
        }
    },
    plugins,
    devtool: 'source-map'
}
