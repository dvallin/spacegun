import chalk from 'chalk'

import { CommandFn } from '.'
import { Options } from '../options'

import * as imageModule from '../images/ImageModule'
import * as clusterModule from '../cluster/ClusterModule'

import { call } from '../dispatcher'
import { pad } from '../pad'
import { IO } from '../IO'

import { load, applyWithConsent } from './helpers'
import { chooseNamespace } from './namespaces'
import { chooseTag } from './images'
import { chooseCluster } from './cluster'
import { logDeployment, logDeploymentHeader } from './deployments'

import { Deployment } from '../cluster/model/Deployment'
import { Batch } from 'src/cluster/model/Batch'
import { logBatch, logBatchHeader } from './batches'

export const deployCommand: CommandFn = async (options: Options, io: IO) => deploy(options, io)
export const restartCommand: CommandFn = async (options: Options, io: IO) => restart(options, io)

async function deploy(options: Options, io: IO) {
    const cluster = await chooseCluster(options, io)
    const namespace = await chooseNamespace(options, io, cluster)
    const resource = await chooseResource(options, io, cluster, namespace)

    const tag = await chooseTag(options, io, resource.result.image!)
    const image = await load(
        call(imageModule.image)({
            name: resource.result.image!.name,
            tag,
        })
    )

    if (resource.first) {
        io.out('deploy ' + chalk.cyan(image.url) + ' into deployment ' + chalk.cyan(cluster + '::' + resource.result.name))
        await applyWithConsent(options, io, async () => {
            const updated = await load(
                call(clusterModule.updateDeployment)({
                    deployment: resource.result,
                    image,
                    group: { cluster, namespace },
                })
            )
            logDeploymentHeader(io)
            logDeployment(io, updated)
        })
    } else {
        io.out('deploy ' + chalk.cyan(image.url) + ' into batch ' + chalk.cyan(cluster + '::' + resource.result.name))
        await applyWithConsent(options, io, async () => {
            const updated = await load(
                call(clusterModule.updateBatch)({
                    batch: resource.result,
                    image,
                    group: { cluster, namespace },
                })
            )
            logBatchHeader(io)
            logBatch(io, updated)
        })
    }
}

async function restart(options: Options, io: IO) {
    const cluster = await chooseCluster(options, io)
    const namespace = await chooseNamespace(options, io, cluster)
    const resource = await chooseResource(options, io, cluster, namespace)
    if (resource.first) {
        io.out('restart deployment ' + chalk.cyan(cluster + '::' + resource.result.name))
        await applyWithConsent(options, io, async () => {
            const updated = await load(
                call(clusterModule.restartDeployment)({
                    deployment: resource.result,
                    group: { cluster, namespace },
                })
            )
            logDeploymentHeader(io)
            logDeployment(io, updated)
        })
    } else {
        io.out('restart batch ' + chalk.cyan(cluster + '::' + resource.result.name))
        await applyWithConsent(options, io, async () => {
            const updated = await load(
                call(clusterModule.restartBatch)({
                    batch: resource.result,
                    group: { cluster, namespace },
                })
            )
            logBatchHeader(io)
            logBatch(io, updated)
        })
    }
}

export async function chooseResource(
    options: Options,
    io: IO,
    cluster: string,
    namespace: string | undefined
): Promise<{ first: boolean; result: Deployment | Batch }> {
    const deployments = await load(call(clusterModule.deployments)({ cluster, namespace }))
    const batches = await load(call(clusterModule.batches)({ cluster, namespace }))

    if (options.deployment) {
        const deployment = deployments.find(d => d.name === options.deployment)
        if (!deployment) {
            throw new Error(`deployment ${options.deployment} does not exist`)
        }
        return { first: true, result: deployment }
    } else if (options.batch) {
        const batch = batches.find(d => d.name === options.deployment)
        if (!batch) {
            throw new Error(`batch ${options.batch} does not exist`)
        }
        return { first: false, result: batch }
    } else {
        io.out('Choose the target deployment')
        deployments.forEach((deployment, index) => {
            io.out(chalk.bold.cyan(index.toString()) + ': ' + pad(deployment.name, 5))
        })
        return await io.chooseMultiple('> ', deployments, batches)
    }
}
