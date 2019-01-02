import chalk from "chalk"

import { Options } from "../options"

import * as clusterModule from "../cluster/ClusterModule"

import { call } from "../dispatcher"
import { pad } from "../pad"
import { IO } from "../IO"

import { load } from "./helpers"

export async function chooseCluster(options: Options, io: IO): Promise<string> {
    const clusters = await load(call(clusterModule.clusters)())

    if (options.cluster) {
        const cluster = clusters.find(n => n === options.cluster)
        if (!cluster) {
            throw new Error(`namespace ${options.namespace} does not exist`)
        }
        return cluster
    } else {
        io.out("Choose the target cluster")
        clusters.forEach((cluster, index) => {
            io.out(chalk.bold.cyan(index.toString()) + ": " + pad(cluster, 5))
        })
        return await io.choose('> ', clusters)
    }
}
