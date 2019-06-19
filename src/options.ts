import * as commandLineArgs from 'command-line-args'

import { Command } from './commands'

export interface Options {
    cluster?: string
    command?: Command
    config?: string
    deployment?: string
    batch?: string
    namespace?: string
    pipeline?: string
    port?: number
    tag?: string
    yes?: boolean
    _unknown?: string[]
}

function parse(): Options {
    const internalOptions = commandLineArgs(
        [
            { name: 'cluster', alias: 'c', type: String },
            { name: 'command', defaultOption: true },
            { name: 'config', type: String },
            { name: 'port', type: Number },
            { name: 'deployment', alias: 'd', type: String },
            { name: 'batch', alias: 'b', type: String },
            { name: 'help', alias: 'h', type: Boolean },
            { name: 'namespace', alias: 'n', type: String },
            { name: 'pipeline', alias: 'p', type: String },
            { name: 'tag', alias: 't', type: String },
            { name: 'version', alias: 'v', type: Boolean },
            { name: 'yes', alias: 'y', type: Boolean },
        ],
        {
            partial: true,
        }
    ) as {
        cluster?: string
        command?: string
        port?: number
        config?: string
        deployment?: string
        batch?: string
        help?: boolean
        namespace?: string
        pipeline?: string
        tag?: string
        version?: boolean
        yes?: boolean
        _unknown: string[]
    }
    let command: Command | undefined
    if (internalOptions.help) {
        command = 'help'
    } else if (internalOptions.version) {
        command = 'version'
    } else if (internalOptions.command !== undefined) {
        switch (internalOptions.command) {
            case 'apply':
            case 'deploy':
            case 'restart':
            case 'deployments':
            case 'batches':
            case 'images':
            case 'namespaces':
            case 'pipelines':
            case 'schedules':
            case 'pods':
            case 'run':
            case 'scalers':
            case 'snapshot':
                command = internalOptions.command
                break
        }
    }

    return {
        cluster: internalOptions.cluster,
        command,
        config: internalOptions.config,
        deployment: internalOptions.deployment,
        batch: internalOptions.batch,
        namespace: internalOptions.namespace,
        pipeline: internalOptions.pipeline,
        port: internalOptions.port,
        tag: internalOptions.tag,
        yes: internalOptions.yes,
        _unknown: internalOptions._unknown,
    }
}

export { parse }
