import * as clusterModule from "../cluster/ClusterModule"
import * as configModule from "../artifacts/ArtifactModule"

import { Options } from "../options"
import { CommandFn } from "."

import { call } from "../dispatcher"
import { IO } from "../IO"

import { load, foreachNamespace, foreachCluster } from "./helpers"

export const snapshotCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) =>
        foreachNamespace(options, io, cluster, snapshot))

export const applySnapshotCommand: CommandFn = async (options: Options, io: IO) =>
    foreachCluster(options, io, (options, io, cluster) =>
        foreachNamespace(options, io, cluster, applySnapshot))


async function snapshot(io: IO, cluster: string, namespace?: string) {
    io.out(`Loading snapshot`)
    const snapshot = await load(call(clusterModule.takeSnapshot)({ cluster, namespace }))

    io.out(`Saving snapshot`)
    for (const deployment of snapshot.deployments) {
        await call(configModule.saveArtifact)({
            path: `${cluster}/${namespace}/deployments`,
            artifact: {
                name: deployment.name,
                data: deployment.data
            }
        })
    }
}

async function applySnapshot(io: IO, cluster: string, namespace?: string) {
    const knownArtifacts = await load(call(configModule.listArtifacts)(`${cluster}/${namespace}/deployments`))
    for (const artifact of knownArtifacts) {
        io.out(`Found snapshot for ${artifact.name}`)
    }
    await call(clusterModule.applySnapshot)({
        group: { cluster, namespace },
        snapshot: { deployments: knownArtifacts }
    })
}
