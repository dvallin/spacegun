import * as clusterModule from '../cluster/ClusterModule'
import * as configModule from '../artifacts/ArtifactModule'

import { Options } from '../options'
import { CommandFn } from '.'

import { call } from '../dispatcher'
import { IO } from '../IO'

import { load, foreachNamespace, foreachCluster } from './helpers'

export const snapshotCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) => foreachNamespace(options, io, cluster, snapshot))

export const applySnapshotCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) => foreachNamespace(options, io, cluster, applySnapshot))

async function snapshot(io: IO, cluster: string, namespace?: string) {
    io.out(`Loading snapshot`)
    const snapshot = await load(call(clusterModule.takeSnapshot)({ cluster, namespace }))

    io.out(`Saving Deployment Snapshots`)
    for (const deployment of snapshot.deployments) {
        await call(configModule.saveArtifact)({
            path: `${cluster}/${namespace}/deployments`,
            artifact: {
                name: deployment.name,
                data: deployment.data,
            },
        })
    }

    io.out(`Saving Batch Snapshots`)
    for (const batch of snapshot.batches) {
        await call(configModule.saveArtifact)({
            path: `${cluster}/${namespace}/batches`,
            artifact: {
                name: batch.name,
                data: batch.data,
            },
        })
    }
}

async function applySnapshot(io: IO, cluster: string, namespace?: string) {
    const deployments = await load(call(configModule.listArtifacts)(`${cluster}/${namespace}/deployments`))
    for (const artifact of deployments) {
        io.out(`Found snapshot for deployment ${artifact.name}`)
    }
    const batches = await load(call(configModule.listArtifacts)(`${cluster}/${namespace}/batches`))
    for (const artifact of batches) {
        io.out(`Found snapshot for batch ${artifact.name}`)
    }
    await call(clusterModule.applySnapshot)({
        group: { cluster, namespace },
        snapshot: { deployments, batches },
    })
}
