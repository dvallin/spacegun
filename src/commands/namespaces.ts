import chalk from 'chalk'

import { CommandFn } from './'
import { Options } from '../options'

import * as clusterModule from '../cluster/ClusterModule'

import { call } from '../dispatcher'
import { pad } from '../pad'
import { IO } from '../IO'

import { load, foreachCluster } from './helpers'

export const namespacesCommand: CommandFn = async (options: Options, io: IO) => foreachCluster(options, io, namespaces)

export async function namespaces({  }: Options, io: IO, cluster: string) {
    io.out(chalk.underline.bold(pad(`${cluster}`)))
    const namespaces = await load(call(clusterModule.namespaces)({ cluster }))
    namespaces.forEach(namespace => io.out(namespace))
}

export async function chooseNamespace(options: Options, io: IO, cluster: string): Promise<string | undefined> {
    const namespaces = await call(clusterModule.namespaces)({ cluster })

    if (options.namespace) {
        const namespace = namespaces.find(n => n === options.namespace)
        if (!namespace) {
            throw new Error(`namespace ${options.namespace} does not exist`)
        }
        return namespace
    } else {
        if (namespaces.length > 0) {
            io.out('Choose the target namespace')
            namespaces.forEach((namespace, index) => {
                io.out(chalk.bold.cyan(index.toString()) + ': ' + pad(namespace, 5))
            })
            return await io.choose('> ', namespaces)
        }
        return Promise.resolve(undefined)
    }
}
