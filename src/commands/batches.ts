import chalk from 'chalk'

import * as clusterModule from '../cluster/ClusterModule'

import { CommandFn } from '.'
import { load, foreachNamespace, foreachCluster } from './helpers'

import { call } from '../dispatcher'
import { pad } from '../pad'
import { IO } from '../IO'
import { Options } from '../options'

import { Batch } from '../cluster/model/Batch'

export const batchesCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) => foreachNamespace(options, io, cluster, batches))

async function batches(io: IO, cluster: string, namespace?: string) {
    const batches = await load(call(clusterModule.batches)({ cluster, namespace }))
    logBatchHeader(io)
    batches.forEach(batch => {
        logBatch(io, batch)
    })
}

export function logBatchHeader(io: IO) {
    io.out(chalk.bold(pad('batch name', 5) + pad('image url', 7) + pad('cron', 2) + pad('concurrency', 2)))
}

export function logBatch(io: IO, batch: Batch) {
    let urlText
    if (batch.image === undefined) {
        urlText = chalk.bold.magenta(pad('missing', 7))
    } else {
        urlText = pad(batch.image.url, 7)
    }
    io.out(pad(batch.name, 5) + urlText + pad(batch.schedule, 2) + pad(batch.concurrencyPolicy, 2))
}
