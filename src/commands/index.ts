import chalk from 'chalk'

import { call } from '../dispatcher'
import { pad } from '../pad'
import { IO } from '../IO'

import * as clusterModule from '../cluster/ClusterModule'
import * as imageModule from '../images/ImageModule'

import { Options } from '../options'

import { podsCommand } from './pods'

import { namespacesCommand } from './namespaces'
import { imagesCommand } from './images'
import { pipelinesCommand, runCommand, pipelineSchedulesCommand } from './pipelines'
import { deployCommand, restartCommand } from './deploy'
import { deploymentsCommand } from './deployments'
import { scalersCommand } from './scalers'
import { snapshotCommand, applySnapshotCommand } from './snapshots'

export type Command =
    | 'namespaces'
    | 'pods'
    | 'images'
    | 'pipelines'
    | 'pipelineSchedules'
    | 'run'
    | 'deployments'
    | 'deploy'
    | 'restart'
    | 'scalers'
    | 'help'
    | 'version'
    | 'snapshot'
    | 'apply'

export async function printHelp(io: IO, error?: Error) {
    const b = chalk.blue
    const m = chalk.magenta
    const c = chalk.cyan
    const CLI_TITLE = chalk.bold.underline('Spacegun-CLI')
    const CLI_DESCRIPTION = 'Space age deployment manager'
    const CLI_USAGE = 'Usage: `spacegun <command> [options ...]`'
    const HELP_HEADER = `
        ${b('/\\')} ${c('*')}    
       ${b('/__\\')}     ${CLI_TITLE}   ${b(`version ${process.env.VERSION}`)}
      ${b('/\\  /')}
     ${b('/__\\/')}      ${CLI_DESCRIPTION}
    ${b('/\\')}  ${m('/\\')}     
   ${b('/__\\')}${m('/__\\')}     ${CLI_USAGE}
  ${b('/\\')}  ${m('/')}    ${m('\\')}
`

    if (error !== undefined) {
        io.out('spacegun version ' + b(process.env.VERSION || '') + ' encountered an error')
        io.out(m(error.message))
        io.out(error.stack || '')
    } else {
        io.out(HELP_HEADER)

        const clusters = await call(clusterModule.clusters)()
        io.out('configured clusters: ' + m(clusters.join(', ')))

        const endpoint = await call(imageModule.endpoint)()
        io.out('configured image endpoint: ' + m(endpoint))

        io.out('')
        io.out(chalk.bold.underline('Available Commands'))
        io.out(pad('namespaces', 2) + chalk.bold(pad('lists all namespaces of all known clusters', 10)))
        io.out(pad('pods', 2) + chalk.bold(pad('a summary of all pods of all known clusters', 10)))
        io.out(pad('snapshot', 2) + chalk.bold(pad('take a snapshot of the cluster and save it as an artifact', 10)))
        io.out(pad('apply', 2) + chalk.bold(pad('apply the snapshot of the cluster', 10)))
        io.out(pad('images', 2) + chalk.bold(pad('a list of all images in the docker registry', 10)))
        io.out(pad('deployments', 2) + chalk.bold(pad('a summary of all deployements of all known clusters', 10)))
        io.out(pad('deploy', 2) + chalk.bold(pad('opens an interactive dialog to deploy an image', 10)))
        io.out(pad('restart', 2) + chalk.bold(pad('opens an interactive dialog to restart a deployment', 10)))
        io.out(pad('scalers', 2) + chalk.bold(pad('a summary of all scalers of all known clusters', 10)))
        io.out(pad('pipelines', 2) + chalk.bold(pad('a summary of all pipelines', 10)))
        io.out(pad('pipelineSchedules', 2) + chalk.bold(pad('the next executions of a pipeline', 10)))
        io.out(pad('run', 2) + chalk.bold(pad('run a pipeline manually', 10)))
        io.out(pad('help', 2) + chalk.bold(pad('renders this summary', 10)))
        io.out('')
        io.out(chalk.bold.underline('General Options'))
        io.out(pad('version, b', 2) + chalk.bold(pad('renders the current version', 10)))
        io.out(pad('help, h', 2) + chalk.bold(pad('renders this summary', 10)))
        io.out(pad('config', 2) + chalk.bold(pad('path to the config.yml. Default: `config.yml`', 10)))
        io.out('')
        io.out(chalk.bold.underline('Interactive Options'))
        io.out(pad('yes, y', 2) + chalk.bold(pad('answer accept prompts with yes', 10)))
        io.out(pad('cluster, c', 2) + chalk.bold(pad('answer cluster prompts with given value', 10)))
        io.out(pad('namespace, n', 2) + chalk.bold(pad('answer namespace prompts with given value', 10)))
        io.out(pad('pipeline, p', 2) + chalk.bold(pad('answer pipeline prompts with given value', 10)))
        io.out(pad('tag, t', 2) + chalk.bold(pad('answer tag prompts with given value', 10)))
    }
}

export async function printVersion(io: IO) {
    io.out(process.env.VERSION || 'unkown version')
}

export type CommandFn = (options: Options, io: IO) => Promise<void>

const commands: { [k in Command]: CommandFn } = {
    namespaces: namespacesCommand,
    snapshot: snapshotCommand,
    apply: applySnapshotCommand,
    pods: podsCommand,
    images: imagesCommand,
    pipelines: pipelinesCommand,
    pipelineSchedules: pipelineSchedulesCommand,
    run: runCommand,
    deployments: deploymentsCommand,
    scalers: scalersCommand,
    deploy: deployCommand,
    restart: restartCommand,
    help: async ({  }: Options, io: IO) => printHelp(io),
    version: async ({  }: Options, io: IO) => printVersion(io),
}

export { commands }
