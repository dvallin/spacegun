import * as moment from "moment"
import * as ora from "ora"
import chalk from "chalk"

import { call } from "./dispatcher"
import { pad } from "./pad"
import { IO } from "./IO"

import * as jobsModule from "./jobs/JobsModule"
import * as clusterModule from "./cluster/ClusterModule"
import * as imageModule from "./images/ImageModule"
import * as configModule from "./artifacts/ArtifactModule"

import { Deployment } from "./cluster/model/Deployment"
import { DeploymentSnapshot } from "./cluster/model/DeploymentSnapshot"
import { Image } from "./cluster/model/Image"

export type Command = "namespaces" | "pods" | "images" | "pipelines" | "pipelineSchedules"
    | "run" | "deployments" | "deploy" | "scalers" | "help" | "snapshot" | "apply"

async function load<T>(p: Promise<T>): Promise<T> {
    const progress = ora()
    progress.start("loading")
    const result = await p
    progress.stop()
    return result
}

async function foreachCluster(io: IO, command: (io: IO, cluster: string) => void) {
    const clusters = await load(call(clusterModule.clusters)())
    for (const cluster of clusters) {
        io.out("")
        await command(io, cluster)
    }
}

async function foreachNamespace(io: IO, cluster: string, command: (io: IO, cluster: string, namespace?: string) => void) {
    const namespaces = await load(call(clusterModule.namespaces)({ cluster }))
    if (namespaces.length === 0) {
        await command(io, cluster)
    } else {
        for (const namespace of namespaces) {
            io.out(chalk.bold(pad(``)))
            io.out(chalk.underline.bold(pad(`${cluster} :: ${namespace}`)))
            await command(io, cluster, namespace)
        }
    }
}

function getRestartText(restarts: number | undefined): string {
    let restartText: string
    if (restarts === undefined) {
        restartText = chalk.bold.cyan(pad("na!", 1))
    } else if (restarts > 30) {
        restartText = chalk.bold.cyan(pad(restarts.toString() + "!", 1))
    } else if (restarts > 10) {
        restartText = chalk.bold.magenta(pad(restarts.toString(), 1))
    } else {
        restartText = pad(restarts.toString(), 1)
    }
    return restartText;
}

function getURLText(image: Image | undefined): string {
    let urlText: string
    if (image === undefined) {
        urlText = chalk.bold.magenta(pad("missing", 5))
    } else {
        urlText = pad(image.url, 5)
    }
    return urlText;
}

function getReadyText(ready: boolean): string {
    return ready ? chalk.bold.magenta(pad("up", 1)) : chalk.bold.cyan(pad("down!", 1))
}

async function podsCommand(io: IO, cluster: string, namespace?: string) {
    const pods = await load(call(clusterModule.pods)({ cluster, namespace }))
    io.out(chalk.bold(
        pad("pod name", 5) +
        pad("image url", 5) +
        pad("starts", 1) +
        pad("status", 1) +
        pad("age", 1)
    ))
    pods.forEach(pod => {
        io.out(
            pad(pod.name, 5) +
            getURLText(pod.image) +
            getRestartText(pod.restarts) +
            getReadyText(pod.ready) +
            pad(pod.age, 1)
        )
    })
}

async function namespacesCommand(io: IO, cluster: string) {
    io.out(chalk.underline.bold(pad(`${cluster}`)))
    const namespaces = await load(call(clusterModule.namespaces)({ cluster }))
    namespaces.forEach(namespace =>
        io.out(namespace)
    )
}

async function imagesCommand(io: IO) {
    const images = await load(call(imageModule.list)())
    images.forEach(image =>
        io.out(image)
    )
}

function logPipelineHeader(io: IO) {
    io.out(chalk.bold(pad("name", 2) + pad("from", 4) + pad("to", 2)))
}

async function pipelinesCommand(io: IO) {
    const pipelines = await load(call(jobsModule.pipelines)())
    logPipelineHeader(io)
    pipelines.forEach(pipeline => {
        io.out(
            chalk.bold(pad(pipeline.name, 2))
            + pad(`${pipeline.steps.length}`, 4)
            + pad(pipeline.cluster, 2)
        )
    })
}

async function pipelineSchedulesCommand(io: IO) {
    io.out("Choose the target pipeline")
    const pipelines = await call(jobsModule.pipelines)()
    pipelines.forEach((pipeline, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(pipeline.name, 5))
    })
    const pipeline = await io.choose('> ', pipelines)
    const schedules = await call(jobsModule.schedules)(pipeline)
    logPipelineHeader(io)
    io.out(
        chalk.bold(pad(pipeline.name, 2))
        + pad(`${pipeline.steps.length}`, 4)
        + pad(pipeline.cluster, 2)
    )
    io.out("")
    if (schedules !== undefined && schedules.lastRun !== undefined) {
        io.out(chalk.magenta("last run") + moment(schedules.lastRun).toISOString())
    } else {
        io.out(chalk.magenta.bold("not run yet!"))
    }
    io.out("")
    io.out(chalk.underline.bold(pad("scheduled runs", 8)))
    if (schedules !== undefined) {
        schedules.nextRuns.forEach(run => {
            io.out(moment(run).toISOString())
        })
    } else {
        io.out("not scheduling this pipeline!")
    }
}

async function runCommand(io: IO) {
    io.out("Choose the target pipeline")
    const pipelines = await call(jobsModule.pipelines)()
    pipelines.forEach((pipeline, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(pipeline.name, 5))
    })
    const pipeline = await io.choose('> ', pipelines)
    const plan = await call(jobsModule.plan)(pipeline)

    io.out(chalk.bold(`planned deployment ${plan.name}`))
    plan.deployments.forEach(deploymentPlan => {
        let previousUrl = "none"
        if (deploymentPlan.deployment.image !== undefined) {
            previousUrl = deploymentPlan.deployment.image.url
        }
        io.out(
            pad(`${deploymentPlan.deployment.name}`, 3) +
            chalk.bold(pad(`${previousUrl}`, 5))
            + chalk.magenta(pad("=>", 1))
            + chalk.bold(pad(`${deploymentPlan.image.url}`, 5)))
    })

    io.out("Answer `yes` to apply.")
    const userAgrees = await io.expect('> ', "yes")
    if (userAgrees) {
        await call(jobsModule.run)(plan)
    }
}

function logDeploymentHeader(io: IO) {
    io.out(chalk.bold(pad("deployment name", 5) + pad("image url", 7)))
}

function logDeployment(io: IO, deployment: Deployment) {
    let urlText
    if (deployment.image === undefined) {
        urlText = chalk.bold.magenta(pad("missing", 7))
    } else {
        urlText = pad(deployment.image.url, 7)
    }
    io.out(pad(deployment.name, 5) + urlText)
}

async function snapshotCommand(io: IO, cluster: string, namespace?: string) {
    io.out(`Loading snapshot`)
    const snapshot = await load(call(clusterModule.takeSnapshot)({ cluster, namespace }))

    io.out(`Saving snapshot`)
    for (const deployment of snapshot.deployments) {
        await call(configModule.saveArtifact)({
            data: deployment.data,
            name: deployment.name,
            path: `${cluster}/${namespace}/deployments`
        })
    }
}

async function applySnapshotCommand(io: IO, cluster: string, namespace?: string) {
    const deployments: DeploymentSnapshot[] = []
    const knownDeployments = await load(call(clusterModule.deployments)({ cluster, namespace }))

    for (const deployment of knownDeployments) {
        io.out(`Loading snapshot for ${deployment.name}`)
        const snapshot = await load(call(configModule.loadArtifact)({
            name: deployment.name,
            path: `${cluster}/${namespace}/deployments`
        }))
        if (snapshot !== undefined) {
            deployments.push({
                name: deployment.name,
                data: snapshot
            })
        }
    }
    await call(clusterModule.applySnapshot)({
        group: { cluster, namespace },
        snapshot: { deployments }
    })
}

async function deployementsCommand(io: IO, cluster: string, namespace?: string) {
    const deployments = await load(call(clusterModule.deployments)({ cluster, namespace }))
    logDeploymentHeader(io)
    deployments.forEach(deployment => {
        logDeployment(io, deployment)
    })
}

async function deployCommand(io: IO) {
    io.out("Choose the target cluster")
    const clusters = await load(call(clusterModule.clusters)())
    clusters.forEach((cluster, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(cluster, 5))
    })
    const cluster = await io.choose('> ', clusters)

    const namespaces = await call(clusterModule.namespaces)({ cluster })
    let namespace = undefined
    if (namespaces.length > 0) {
        io.out("Choose the target namespace")
        namespaces.forEach((namespace, index) => {
            io.out(chalk.bold.cyan(index.toString()) + ": " + pad(namespace, 5))
        })
        namespace = await io.choose('> ', namespaces)
    }

    const deployments = await load(call(clusterModule.deployments)({ cluster, namespace }))

    io.out("Choose the target deployment")
    deployments.forEach((deployment, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(deployment.name, 5))
    })
    const deployment = await io.choose('> ', deployments)

    const tags = await load(call(imageModule.tags)(deployment.image!))
    tags.sort()

    io.out("Choose the target image")
    tags.forEach((tag, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(tag, 5))
    })
    const tag = await io.choose('> ', tags)

    const image = await load(call(imageModule.image)({
        name: deployment.image!.name,
        tag
    }))

    io.out("deploy " + chalk.cyan(image.url) + " into " + chalk.cyan(cluster + "::" + deployment.name))
    io.out("Answer `yes` to apply.")
    const userAgrees = await io.expect('> ', "yes")
    if (userAgrees) {
        const updated = await load(call(clusterModule.updateDeployment)({
            deployment,
            image,
            group: { cluster, namespace }
        }))
        logDeploymentHeader(io)
        logDeployment(io, updated)
    }
}

async function scalersCommand(io: IO, cluster: string, namespace?: string) {
    const scalers = await load(call(clusterModule.scalers)({ cluster, namespace }))
    io.out(chalk.bold(pad("scaler name", 5) + pad("replication", 7)))
    io.out(chalk.bold(pad("", 5) + pad("current", 3) + pad("minimum", 2) + pad("maximum", 2)))
    scalers.forEach(scaler => {
        let line = pad(scaler.name, 5)
        let currentText = scaler.replicas.current.toString()
        if (scaler.replicas.current < scaler.replicas.minimum) {
            currentText = chalk.bold.cyan(pad(currentText + "!", 3))
        } else if (scaler.replicas.current >= scaler.replicas.maximum) {
            currentText = chalk.bold.magenta(pad(currentText, 3))
        } else {
            currentText = pad(currentText, 3)
        }
        line += currentText
        line += pad(scaler.replicas.minimum.toString(), 2) + pad(scaler.replicas.maximum.toString(), 2)
        io.out(line)
    })
}

export async function printHelp(io: IO, error?: Error) {
    const b = chalk.blue;
    const m = chalk.magenta;
    const c = chalk.cyan;
    const CLI_TITLE = chalk.bold.underline('Spacegun-CLI')
    const CLI_DESCRIPTION = 'Space age deployment manager'
    const CLI_USAGE = 'Usage: \`spacegun <command> [options ...]\`'

    const HELP_HEADER = `
        ${b('/\\')} ${c('*')}    
       ${b('/__\\')}     ${CLI_TITLE}   ${b(`version ${process.env.VERSION}`)}
      ${b('/\\  /')}
     ${b('/__\\/')}      ${CLI_DESCRIPTION}
    ${b('/\\')}  ${m('/\\')}     
   ${b('/__\\')}${m('/__\\')}     ${CLI_USAGE}
  ${b('/\\')}  ${m('/')}    ${m('\\')}
`
    io.out(HELP_HEADER)

    if (error !== undefined) {
        io.out(c("An error occured"))
        io.out(c(error.message))
        io.out("")
    } else {
        const clusters = await call(clusterModule.clusters)()
        io.out('configured clusters: ' + m(clusters.join(", ")))

        const endpoint = await call(imageModule.endpoint)()
        io.out('configured image endpoint: ' + m(endpoint))
    }

    io.out('')
    io.out(chalk.bold.underline('Available Commands'))
    io.out(pad("namespaces", 2) + chalk.bold(pad("lists all namespaces of all known clusters", 10)))
    io.out(pad("pods", 2) + chalk.bold(pad("a summary of all pods of all known clusters", 10)))
    io.out(pad("snapshot", 2) + chalk.bold(pad("take a snapshot of the cluster and save it as an artifact", 10)))
    io.out(pad("apply", 2) + chalk.bold(pad("apply the snapshot of the cluster", 10)))
    io.out(pad("images", 2) + chalk.bold(pad("a list of all images in the docker registry", 10)))
    io.out(pad("deployments", 2) + chalk.bold(pad("a summary of all deployements of all known clusters", 10)))
    io.out(pad("deploy", 2) + chalk.bold(pad("opens an interactive dialog to deploy an image", 10)))
    io.out(pad("scalers", 2) + chalk.bold(pad("a summary of all scalers of all known clusters", 10)))
    io.out(pad("pipelines", 2) + chalk.bold(pad("a summary of all pipelines", 10)))
    io.out(pad("pipelineSchedules", 2) + chalk.bold(pad("the next executions of a pipeline", 10)))
    io.out(pad("run", 2) + chalk.bold(pad("run a pipeline manually", 10)))
    io.out(pad("help", 2) + chalk.bold(pad("renders this summary", 10)))
    io.out('')
    io.out(chalk.bold.underline('Available Options'))
    io.out(pad("config, c", 2) + chalk.bold(pad("path to the config.yml. Default: `config.yml`", 10)))
}

const commands: { [k in Command]: (io: IO) => Promise<void> } = {
    "namespaces": async (io: IO) => foreachCluster(io, namespacesCommand),
    "snapshot": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, snapshotCommand)),
    "apply": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, applySnapshotCommand)),
    "pods": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, podsCommand)),
    "images": async (io: IO) => imagesCommand(io),
    "pipelines": async (io: IO) => pipelinesCommand(io),
    "pipelineSchedules": async (io: IO) => pipelineSchedulesCommand(io),
    "run": async (io: IO) => runCommand(io),
    "deployments": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, deployementsCommand)),
    "scalers": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, scalersCommand)),
    "deploy": async (io: IO) => deployCommand(io),
    "help": async (io: IO) => printHelp(io)
}

export { commands }
