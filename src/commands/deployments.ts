import chalk from "chalk"

import * as clusterModule from "../cluster/ClusterModule"

import { CommandFn } from "."
import { load, foreachNamespace, foreachCluster } from "./helpers"

import { call } from "../dispatcher"
import { pad } from "../pad"
import { IO } from "../IO"
import { Options } from "../options"

import { Deployment } from "../cluster/model/Deployment"

export const deploymentsCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) =>
        foreachNamespace(options, io, cluster, deployments))


async function deployments(io: IO, cluster: string, namespace?: string) {
    const deployments = await load(call(clusterModule.deployments)({ cluster, namespace }))
    logDeploymentHeader(io)
    deployments.forEach(deployment => {
        logDeployment(io, deployment)
    })
}


export function logDeploymentHeader(io: IO) {
    io.out(chalk.bold(pad("deployment name", 5) + pad("image url", 7)))
}

export function logDeployment(io: IO, deployment: Deployment) {
    let urlText
    if (deployment.image === undefined) {
        urlText = chalk.bold.magenta(pad("missing", 7))
    } else {
        urlText = pad(deployment.image.url, 7)
    }
    io.out(pad(deployment.name, 5) + urlText)
}
