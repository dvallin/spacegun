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

export const deployCommand: CommandFn = async (options: Options, io: IO) => deploy(options, io)
export const restartCommand: CommandFn = async (options: Options, io: IO) => restart(options, io)

async function deploy(options: Options, io: IO) {
    const cluster = await chooseCluster(options, io)
    const namespace = await chooseNamespace(options, io, cluster)
    const deployment = await chooseDeployment(options, io, cluster, namespace)
    const tag = await chooseTag(options, io, deployment.image!)

    const image = await load(
        call(imageModule.image)({
            name: deployment.image!.name,
            tag,
        })
    )

    io.out('deploy ' + chalk.cyan(image.url) + ' into ' + chalk.cyan(cluster + '::' + deployment.name))
    await applyWithConsent(options, io, async () => {
        const updated = await load(
            call(clusterModule.updateDeployment)({
                deployment,
                image,
                group: { cluster, namespace },
            })
        )
        logDeploymentHeader(io)
        logDeployment(io, updated)
    })
}

async function restart(options: Options, io: IO) {
    const cluster = await chooseCluster(options, io)
    const namespace = await chooseNamespace(options, io, cluster)
    const deployment = await chooseDeployment(options, io, cluster, namespace)

    io.out('restart deployment ' + chalk.cyan(cluster + '::' + deployment.name))
    await applyWithConsent(options, io, async () => {
        const updated = await load(
            call(clusterModule.restartDeployment)({
                deployment,
                group: { cluster, namespace },
            })
        )
        logDeploymentHeader(io)
        logDeployment(io, updated)
    })
}

export async function chooseDeployment(options: Options, io: IO, cluster: string, namespace: string | undefined): Promise<Deployment> {
    const deployments = await load(call(clusterModule.deployments)({ cluster, namespace }))

    if (options.deployment) {
        const deployment = deployments.find(d => d.name === options.deployment)
        if (!deployment) {
            throw new Error(`deployment ${options.deployment} does not exist`)
        }
        return deployment
    } else {
        io.out('Choose the target deployment')
        deployments.forEach((deployment, index) => {
            io.out(chalk.bold.cyan(index.toString()) + ': ' + pad(deployment.name, 5))
        })
        return await io.choose('> ', deployments)
    }
}
