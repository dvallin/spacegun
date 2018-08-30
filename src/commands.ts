import * as moment from "moment"
import * as ora from "ora"
import chalk from "chalk"

import { call } from "@/dispatcher"
import { pad } from "@/pad"
import { IO } from "@/IO"

import * as jobsModule from "@/jobs/JobsModule"
import * as clusterModule from "@/cluster/ClusterModule"
import * as imageModule from "@/images/ImageModule"

import { Deployment } from "@/cluster/model/Deployment"

export type Command = "namespaces" | "pods" | "images" | "jobs" | "jobSchedules"
    | "run" | "deployments" | "deploy" | "scalers" | "help"

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
        command(io, cluster)
    } else {
        for (const namespace of namespaces) {
            io.out(chalk.bold(pad(``)))
            io.out(chalk.underline.bold(pad(`${cluster} ∞ ${namespace}`)))
            await command(io, cluster, namespace)
        }
    }
}

async function podsCommand(io: IO, cluster: string, namespace?: string) {
    const pods = await load(call(clusterModule.pods)({ cluster, namespace }))
    io.out(chalk.bold(pad("pod name", 5) + pad("tag name", 5) + pad("starts", 1) + pad("status", 1)))
    pods.forEach(pod => {
        let restartText
        if (pod.restarts === undefined) {
            restartText = chalk.bold.cyan(pad("na!", 1))
        } else if (pod.restarts > 30) {
            restartText = chalk.bold.cyan(pad(pod.restarts.toString() + "!", 1))
        } else if (pod.restarts > 10) {
            restartText = chalk.bold.magenta(pad(pod.restarts.toString(), 1))
        } else {
            restartText = pad(pod.restarts.toString(), 1)
        }
        const statusText = pod.ready ? chalk.bold.magenta(pad("up", 1)) : chalk.bold.cyan(pad("down!", 1))
        let tagText
        if (pod.image === undefined) {
            tagText = chalk.bold.magenta(pad("missing", 5))
        } else {
            tagText = pad(pod.image.tag, 5)
        }
        io.out(pad(pod.name, 5) + tagText + restartText + statusText)
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
    const images = await load(call(imageModule.images)())
    images.forEach(image =>
        io.out(image)
    )
}

function logJobHeader(io: IO) {
    io.out(chalk.bold(pad("name", 2) + pad("from", 4) + pad("to", 2)))
}

async function jobsCommand(io: IO) {
    const jobs = await load(call(jobsModule.jobs)())
    logJobHeader(io)
    jobs.forEach(job => {
        io.out(
            chalk.bold(pad(job.name, 2))
            + pad(`${job.from.type} (${job.from.expression})`, 4)
            + pad(job.cluster, 2)
        )
    })
}

async function jobSchedulesCommand(io: IO) {
    io.out("Choose the target job")
    const jobs = await call(jobsModule.jobs)()
    jobs.forEach((job, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(job.name, 5))
    })
    const job = await io.choose('> ', jobs)
    const schedules = await call(jobsModule.schedules)(job)
    logJobHeader(io)
    io.out(
        chalk.bold(pad(job.name, 2))
        + pad(`${job.from.type} (${job.from.expression})`, 4)
        + pad(job.cluster, 2)
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
        io.out("not scheduling this job!")
    }
}

async function runCommand(io: IO) {
    io.out("Choose the target job")
    const jobs = await call(jobsModule.jobs)()
    jobs.forEach((job, index) => {
        io.out(chalk.bold.cyan(index.toString()) + ": " + pad(job.name, 5))
    })
    const job = await io.choose('> ', jobs)
    const plan = await call(jobsModule.plan)(job)

    io.out(chalk.bold(`planned deployment ${plan.name}`))
    plan.deployments.forEach(deploymentPlan => {
        let previousTag = "none"
        if (deploymentPlan.deployment.image !== undefined) {
            previousTag = deploymentPlan.deployment.image.tag
        }
        io.out(
            pad(`${deploymentPlan.deployment.name}`, 3) +
            chalk.bold(pad(`${previousTag}`, 5))
            + chalk.magenta(pad("=>", 1))
            + chalk.bold(pad(`${deploymentPlan.image.tag}`, 5)))
    })

    io.out("Answer `yes` to apply.")
    const userAgrees = await io.expect('> ', "yes")
    if (userAgrees) {
        await call(jobsModule.run)(plan)
    }
}

function logDeploymentHeader(io: IO) {
    io.out(chalk.bold(pad("deployment name", 5) + pad("tag name", 7)))
}

function logDeployment(io: IO, deployment: Deployment) {
    let tagText
    if (deployment.image === undefined) {
        tagText = chalk.bold.magenta(pad("missing", 7))
    } else {
        tagText = pad(deployment.image.tag, 7)
    }
    io.out(pad(deployment.name, 5) + tagText)
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

    const versions = await load(call(imageModule.versions)(deployment.image!))

    versions.sort((a, b) => b.lastUpdated - a.lastUpdated)
    io.out("Choose the target image")
    versions.forEach((image, index) => {
        if (image.tag === deployment.image!.tag) {
            io.out(chalk.italic.magenta(index.toString()) + ": " + chalk.italic.magenta(pad(image.tag, 5)))
        } else {
            io.out(chalk.bold.cyan(index.toString()) + ": " + pad(image.tag, 5))
        }
    })
    const image = await io.choose('> ', versions)

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
       ${b('/__\\')}     ${CLI_TITLE}   ${b('version 0.0.8')}
      ${b('/\\  /')}
     ${b('/__\\/')}      ${CLI_DESCRIPTION}
    ${b('/\\')}  ${m('/\\')}     
   ${b('/__\\')}${m('/__\\')}     ${CLI_USAGE}
  ${b('/\\')}  ${m('/')}    ${m('\\')}
`
    io.out(HELP_HEADER)

    if (error !== undefined) {
        io.out(c("An error occured during startup"))
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
    io.out(pad("images", 2) + chalk.bold(pad("a list of all images in the docker registry", 10)))
    io.out(pad("deployments", 2) + chalk.bold(pad("a summary of all deployements of all known clusters", 10)))
    io.out(pad("deploy", 2) + chalk.bold(pad("opens an interactive dialog to deploy an image", 10)))
    io.out(pad("scalers", 2) + chalk.bold(pad("a summary of all scalers of all known clusters", 10)))
    io.out(pad("help", 2) + chalk.bold(pad("renders this summary", 10)))
    io.out('')
    io.out(chalk.bold.underline('Available Options'))
    io.out(pad("config, c", 2) + chalk.bold(pad("path to the config.yml. Default: `config.yml`", 10)))
}

const commands: { [k in Command]: (io: IO) => Promise<void> } = {
    "namespaces": async (io: IO) => foreachCluster(io, namespacesCommand),
    "pods": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, podsCommand)),
    "images": async (io: IO) => imagesCommand(io),
    "jobs": async (io: IO) => jobsCommand(io),
    "jobSchedules": async (io: IO) => jobSchedulesCommand(io),
    "run": async (io: IO) => runCommand(io),
    "deployments": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, deployementsCommand)),
    "scalers": async (io: IO) => foreachCluster(io, (io, cluster) => foreachNamespace(io, cluster, scalersCommand)),
    "deploy": async (io: IO) => deployCommand(io),
    "help": async (io: IO) => printHelp(io)
}

export { commands }
