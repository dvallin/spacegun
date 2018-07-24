import { Deployment } from "@/cluster/model/Deployment"

import { get } from "@/dispatcher"

import { pad } from "@/pad"
import chalk from "chalk"

import * as ora from "ora"
import { Question } from "@/Question"

import * as jobsModule from "@/jobs/JobsModule"

import * as clusterModule from "@/cluster/ClusterModule"
import { Pod } from "@/cluster/model/Pod"

import * as imageModule from "@/images/ImageModule"
import { Image } from "@/images/model/Image"
import { Scaler } from "@/cluster/model/Scaler"
import { RequestInput } from "@/dispatcher/model/RequestInput"
import { JobPlan } from "@/jobs/model/JobPlan"

export type Command = "pods" | "images" | "jobs" | "run" | "deployments" | "deploy" | "scalers" | "help"

async function load<T>(p: Promise<T>): Promise<T> {
    const progress = ora()
    progress.start("loading")
    const result = await p
    progress.stop()
    return result
}

async function foreachCluster(f: (cluster: string) => void) {
    const clusters = await get<string[]>(clusterModule.moduleName, clusterModule.functions.clusters)()
    for (const cluster of clusters) {
        console.log("")
        console.log(chalk.underline.bold(pad(`${cluster}`)))
        await f(cluster)
    }
}

async function podsCommand(cluster: string) {
    const pods = await get<Pod[]>(clusterModule.moduleName, clusterModule.functions.pods)(
        RequestInput.of(["cluster", cluster])
    )
    console.log(chalk.bold(pad("pod name", 5) + pad("tag name", 5) + pad("starts", 1), pad("status", 1)))
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
        console.log(pad(pod.name, 5) + tagText + restartText + statusText)
    })
}

async function imagesCommand() {
    const images = await get<string[]>(imageModule.moduleName, imageModule.functions.images)()
    images.forEach(image =>
        console.log(image)
    )
}

async function jobsCommand() {
    const jobs = await get<string[]>(jobsModule.moduleName, jobsModule.functions.jobs)()
    jobs.forEach(job =>
        console.log(job)
    )
}

async function runCommand() {
    const question = new Question()
    try {
        console.log("Choose the target job")
        const jobs = await get<string[]>(jobsModule.moduleName, jobsModule.functions.jobs)()
        jobs.forEach((job, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(job, 5))
        })
        const job = await question.choose('> ', jobs)

        const plan = await get<JobPlan>(jobsModule.moduleName, jobsModule.functions.plan)(
            RequestInput.of(["name", job])
        )

        console.log(chalk.bold(`planned deployment ${plan.name}`))
        plan.deployments.forEach(deployment => {
            let previousTag = "none"
            if (deployment.deployment.image !== undefined) {
                previousTag = deployment.deployment.image.tag
            }
            console.log(
                pad(`${deployment.deployment.name}`, 3) +
                chalk.bold(pad(`${previousTag}`, 5))
                + chalk.magenta(pad("=>", 1))
                + chalk.bold(pad(`${deployment.image.tag}`, 5)))
        })

        console.log("Answer `yes` to apply.")
        const userAgrees = await question.expect('> ', "yes")
        if (userAgrees) {
            await get<void>(jobsModule.moduleName, jobsModule.functions.run)(
                RequestInput.ofData(plan, ["name", job])
            )
        }
    } catch (error) {
        console.error(error)
    } finally {
        question.close()
    }
}

function logDeploymentHeader() {
    console.log(chalk.bold(pad("deployment name", 5) + pad("tag name", 7)))
}

function logDeployment(deployment: Deployment) {
    let tagText
    if (deployment.image === undefined) {
        tagText = chalk.bold.magenta(pad("missing", 7))
    } else {
        tagText = pad(deployment.image.tag, 7)
    }
    console.log(pad(deployment.name, 5) + tagText)
}

async function deployementsCommand(cluster: string) {
    const deployments = await load(
        get<Deployment[]>(clusterModule.moduleName, clusterModule.functions.deployments)(
            RequestInput.of(["cluster", cluster])
        )
    )
    logDeploymentHeader()
    deployments.forEach(deployment => {
        logDeployment(deployment)
    })
}

async function deployCommand() {
    const question = new Question()
    try {
        console.log("Choose the target cluster")
        const clusters = await get<string[]>(clusterModule.moduleName, clusterModule.functions.clusters)()
        clusters.forEach((cluster, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(cluster, 5))
        })
        const cluster = await question.choose('> ', clusters)

        const deployments = await load(
            get<Deployment[]>(clusterModule.moduleName, clusterModule.functions.deployments)(
                RequestInput.of(["cluster", cluster])
            )
        )

        console.log("Choose the target deployment")
        deployments.forEach((deployment, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(deployment.name, 5))
        })
        const deployment = await question.choose('> ', deployments)

        const versions = await load(
            get<Image[]>(imageModule.moduleName, imageModule.functions.versions)(
                RequestInput.of(["name", deployment.image!.name])
            )
        )
        versions.sort((a, b) => b.lastUpdated - a.lastUpdated)
        console.log("Choose the target image")
        versions.forEach((image, index) => {
            if (image.tag === deployment.image!.tag) {
                console.log(chalk.italic.magenta(index.toString()) + ": " + chalk.italic.magenta(pad(image.tag, 5)))
            } else {
                console.log(chalk.bold.cyan(index.toString()) + ": " + pad(image.tag, 5))
            }
        })
        const image = await question.choose('> ', versions)

        console.log("deploy " + chalk.cyan(image.url) + " into " + chalk.cyan(cluster + "::" + deployment.name))
        console.log("Answer `yes` to apply.")
        const userAgrees = await question.expect('> ', "yes")
        if (userAgrees) {
            const updated = await get<Deployment>(clusterModule.moduleName, clusterModule.functions.updateDeployment)(
                RequestInput.ofData({ cluster, deployment, image })
            )
            logDeploymentHeader()
            logDeployment(updated)
        }
    } catch (error) {
        console.error(error)
    } finally {
        question.close()
    }
}

async function scalersCommand(cluster: string) {
    const scalers = await load(get<Scaler[]>(clusterModule.moduleName, clusterModule.functions.scalers)(
        RequestInput.of(["cluster", cluster])
    ))
    console.log(chalk.bold(pad("scaler name", 5) + pad("replication", 7)))
    console.log(chalk.bold(pad("", 5) + pad("current", 3) + pad("minimum", 2) + pad("maximum", 2)))
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
        console.log(line)
    })
}

export async function printHelp(invalidConfig: boolean = false) {
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
    console.log(HELP_HEADER)

    if (invalidConfig) {
        console.log(c('no configuration file found!'))
        console.log(c('A config.yml containing the following line might be sufficient'))
        console.log(b('docker: https://your.docker.registry/'))
        console.log("")
    }
    const clusters = await get<string[]>(clusterModule.moduleName, clusterModule.functions.clusters)()
    console.log('configured clusters: ' + m(clusters.join(", ")))

    const endpoint = await get<string>(imageModule.moduleName, imageModule.functions.endpoint)()
    console.log('configured image endpoint: ' + m(endpoint))

    console.log('')
    console.log(chalk.bold.underline('Available Commands'))
    console.log(pad("pods", 2) + chalk.bold(pad("a summary of all pods of all known clusters", 10)))
    console.log(pad("images", 2) + chalk.bold(pad("a list of all images in the docker registry", 10)))
    console.log(pad("deployments", 2) + chalk.bold(pad("a summary of all deployements of all known clusters", 10)))
    console.log(pad("deploy", 2) + chalk.bold(pad("opens an interactive dialog to deploy an image", 10)))
    console.log(pad("scalers", 2) + chalk.bold(pad("a summary of all scalers of all known clusters", 10)))
    console.log(pad("help", 2) + chalk.bold(pad("renders this summary", 10)))
    console.log('')
    console.log(chalk.bold.underline('Available Options'))
    console.log(pad("config, c", 2) + chalk.bold(pad("path to the config.yml. Default: `config.yml`", 10)))
}

const commands: { [k in Command]: () => Promise<void> } = {
    "pods": async () => foreachCluster(podsCommand),
    "images": async () => imagesCommand(),
    "jobs": async () => jobsCommand(),
    "run": async () => runCommand(),
    "deployments": async () => foreachCluster(deployementsCommand),
    "scalers": async () => foreachCluster(scalersCommand),
    "deploy": async () => deployCommand(),
    "help": async () => printHelp()
}

export { commands }
