import * as moment from "moment"
import chalk from "chalk"

import { CommandFn } from "./"
import { Options } from "../options"

import * as clusterModule from "../cluster/ClusterModule"
import { Image } from "../cluster/model/Image"

import { call } from "../dispatcher"
import { pad } from "../pad"
import { IO } from "../IO"

import { load, foreachCluster, foreachNamespace } from "./helpers"

export const podsCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) =>
        foreachNamespace(options, io, cluster, pods))

async function pods(io: IO, cluster: string, namespace?: string) {
    const pods = await load(call(clusterModule.pods)({ cluster, namespace }))
    io.out(chalk.bold(
        pad("pod name", 5) +
        pad("starts", 1) +
        pad("status", 1) +
        pad("age", 2) +
        pad("image url", 5)
    ))
    pods.forEach(pod => {
        const age: string = pad(moment(pod.createdAt).fromNow(true), 2)
        io.out(
            pad(pod.name, 5) +
            getRestartText(pod.restarts) +
            getReadyText(pod.ready) +
            age +
            getURLText(pod.image)
        )
    })
}

function getRestartText(restarts: number | undefined): string {
    let restartText: string
    if (restarts === undefined) {
        restartText = chalk.bold.cyan(pad("na!", 1))
    } else if (restarts > 30) {
        restartText = chalk.bold.cyan(pad(restarts.toString() + "!", 1))
    } else if (restarts > 10) {
        restartText = chalk.bold.magenta(pad(restarts.toString(), 1))
    } else {
        restartText = pad(restarts.toString(), 1)
    }
    return restartText;
}

function getURLText(image: Image | undefined): string {
    let urlText: string
    if (image === undefined) {
        urlText = chalk.bold.magenta(pad("missing", 5))
    } else {
        urlText = pad(image.url.substr(0), 5)
    }
    return urlText;
}

function getReadyText(ready: boolean): string {
    return ready ? chalk.bold.magenta(pad("up", 1)) : chalk.bold.cyan(pad("down!", 1))
}
