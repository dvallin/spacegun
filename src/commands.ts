import { ClusterProvider, Deployment } from "./cluster/Cluster"
import { ImageProvider } from "./images/ImageProvider"
import { pad } from "./pad"
import chalk from "chalk"

import * as ora from "ora"
import { Question } from "./Question"

export type Command = "pods" | "images" | "deployments" | "deploy" | "scalers" | "help"

async function load<T>(p: Promise<T>): Promise<T> {
    const progress = ora()
    progress.start("loading")
    const result = await p
    progress.stop()
    return result
}

async function foreachCluster(clusterProvider: ClusterProvider, f: (clusterProvider: ClusterProvider, cluster: string) => void) {
    for (const cluster of clusterProvider.clusters) {
        console.log("")
        console.log(chalk.underline.bold(pad(`${cluster}`)))
        await f(clusterProvider, cluster)
    }
}

async function podsCommand(clusterProvider: ClusterProvider, cluster: string) {
    const pods = await load(clusterProvider.pods(cluster))
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

async function imagesCommand(imageProvider: ImageProvider) {
    const images = await imageProvider.images()
    images.forEach(image =>
        console.log(image)
    )
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

async function deployementsCommand(clusterProvider: ClusterProvider, cluster: string) {
    const deployments = await load(clusterProvider.deployments(cluster))
    logDeploymentHeader()
    deployments.forEach(deployment => {
        logDeployment(deployment)
    })
}

async function deployCommand(clusterProvider: ClusterProvider, imageProvider: ImageProvider) {
    const question = new Question()
    try {
        console.log("Choose the target cluster")
        clusterProvider.clusters.forEach((cluster, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(cluster, 5))
        })
        const targetCluster = await question.choose('> ', clusterProvider.clusters)

        const deployments = await load(clusterProvider.deployments(targetCluster))

        console.log("Choose the target deployment")
        deployments.forEach((deployment, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(deployment.name, 5))
        })
        const targetDeployment = await question.choose('> ', deployments)

        const versions = await imageProvider.versions(targetDeployment.image!.name)
        versions.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
        console.log("Choose the target image")
        versions.forEach((image, index) => {
            if (image.tag === targetDeployment.image!.tag) {
                console.log(chalk.italic.magenta(index.toString()) + ": " + chalk.italic.magenta(pad(image.tag, 5)))
            } else {
                console.log(chalk.bold.cyan(index.toString()) + ": " + pad(image.tag, 5))
            }
        })
        const targetImage = await question.choose('> ', versions)

        console.log("deploy " + chalk.cyan(targetImage.url) + " into " + chalk.cyan(targetCluster + "::" + targetDeployment.name))
        console.log("Answer `yes` to apply.")
        const userAgrees = await question.expect('> ', "yes")
        if (userAgrees) {
            const updated = await clusterProvider.updateDeployment(targetCluster, targetDeployment, targetImage)
            logDeploymentHeader()
            logDeployment(updated)
        }
    } catch (error) {
        console.error(error)
    } finally {
        question.close()
    }
}

async function scalersCommand(clusterProvider: ClusterProvider, cluster: string) {
    const scalers = await load(clusterProvider.scalers(cluster))
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

export function printHelp(clusterProvider?: ClusterProvider, imageProvider?: ImageProvider, invalidConfig: boolean = false) {
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
    if (clusterProvider !== undefined) {
        console.log('configured clusters: ' + m(clusterProvider.clusters.join(", ")))
    } else {
        console.log(c('no clusters configured! (such as your kubernetes)'))
    }
    if (imageProvider !== undefined) {
        console.log('configured image endpoint: ' + m(imageProvider.endpoint))
    } else {
        console.log(c('no image registry configured! (such as your docker registry)'))
    }

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

const commands: { [k in Command]: (clusterProvider: ClusterProvider, imageProvider: ImageProvider) => Promise<void> } = {
    "pods": async (clusterProvider: ClusterProvider, { }: ImageProvider) => {
        foreachCluster(clusterProvider, podsCommand)
    },
    "images": async ({ }: ClusterProvider, imageProvider: ImageProvider) => {
        imagesCommand(imageProvider)
    },
    "deployments": async (clusterProvider: ClusterProvider, { }: ImageProvider) => {
        foreachCluster(clusterProvider, deployementsCommand)
    },
    "scalers": async (clusterProvider: ClusterProvider, { }: ImageProvider) => {
        foreachCluster(clusterProvider, scalersCommand)
    },
    "deploy": async (clusterProvider: ClusterProvider, imageProvider: ImageProvider) => {
        deployCommand(clusterProvider, imageProvider)
    },
    "help": async (clusterProvider: ClusterProvider, imageProvider: ImageProvider) => {
        printHelp(clusterProvider, imageProvider)
    }
}

export { commands }
