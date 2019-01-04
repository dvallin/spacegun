import chalk from "chalk"

import * as clusterModule from "../cluster/ClusterModule"

import { Options } from "../options"
import { CommandFn } from "."

import { call } from "../dispatcher"
import { pad } from "../pad"
import { IO } from "../IO"

import { load, foreachNamespace, foreachCluster } from "./helpers"

export const scalersCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) =>
        foreachNamespace(options, io, cluster, scalers))

async function scalers(io: IO, cluster: string, namespace?: string) {
    const scalers = await load(call(clusterModule.scalers)({ cluster, namespace }))
    io.out(chalk.bold(pad("scaler name", 5) + pad("replication", 7)))
    io.out(chalk.bold(pad("", 5) + pad("current", 3) + pad("minimum", 2) + pad("maximum", 2)))
    scalers.forEach(scaler => {
        let line = pad(scaler.name, 5)
        let currentText = scaler.replicas.current.toString()
        if (scaler.replicas.current < scaler.replicas.minimum) {
            currentText = chalk.bold.cyan(pad(currentText + "!", 3))
        } else if (scaler.replicas.current >= scaler.replicas.maximum) {
            currentText = chalk.bold.magenta(pad(currentText, 3))
        } else {
            currentText = pad(currentText, 3)
        }
        line += currentText
        line += pad(scaler.replicas.minimum.toString(), 2) + pad(scaler.replicas.maximum.toString(), 2)
        io.out(line)
    })
}
