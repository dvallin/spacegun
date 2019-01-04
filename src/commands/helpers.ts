import * as ora from "ora"
import chalk from "chalk"

import { call } from "../dispatcher"
import { pad } from "../pad"
import { IO } from "../IO"

import * as clusterModule from "../cluster/ClusterModule"

import { Options } from "../options"

export async function load<T>(p: Promise<T>): Promise<T> {
    const progress = ora()
    try {
        progress.start("loading")
        return await p
    } finally {
        progress.stop()
    }
}

export async function applyWithConsent(options: Options, io: IO, f: () => Promise<void>) {
    if (options.yes) {
        return f()
    } else {
        io.out("Answer `yes` to apply.")
        const userAgrees = await io.expect('> ', "yes")
        if (userAgrees) {
            return f()
        }
    }
}

export async function foreachCluster(options: Options, io: IO, command: (options: Options, io: IO, cluster: string) => void) {
    if (options.cluster) {
        await command(options, io, options.cluster)
    } else {
        const clusters = await load(call(clusterModule.clusters)())
        for (const cluster of clusters) {
            io.out("")
            try {
                await command(options, io, cluster)
            } catch (e) {
                io.error(e)
            }
        }
    }
}

export async function foreachNamespace(options: Options, io: IO, cluster: string, command: (io: IO, cluster: string, namespace?: string) => void) {
    if (options.namespace) {
        io.out(chalk.underline.bold(pad(`${cluster} :: ${options.namespace}`)))
        await command(io, cluster, options.namespace)
    } else {
        const namespaces = await load(call(clusterModule.namespaces)({ cluster }))
        if (namespaces.length === 0) {
            await command(io, cluster)
        } else {
            for (const namespace of namespaces) {
                io.out(chalk.bold(pad(``)))
                io.out(chalk.underline.bold(pad(`${cluster} :: ${namespace}`)))
                try {
                    await command(io, cluster, namespace)
                } catch (e) {
                    io.error(e)
                }
            }
        }
    }
}
