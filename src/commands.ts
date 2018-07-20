import { ClusterRepository } from "@/cluster/ClusterRepository"
import { Deployment } from "@/cluster/model/Deployment"

import { ImageRepository } from "@/images/ImageRepository"

import { pad } from "@/pad"
import chalk from "chalk"

import * as ora from "ora"
import { Question } from "@/Question"

export type Command = "pods" | "images" | "deployments" | "deploy" | "scalers" | "help"

async function load<T>(p: Promise<T>): Promise<T> {
    const progress = ora()
    progress.start("loading")
    const result = await p
    progress.stop()
    return result
}

async function foreachCluster(clusterRepository: ClusterRepository, f: (clusterRepository: ClusterRepository, cluster: string) => void) {
    for (const cluster of clusterRepository.clusters) {
        console.log("")
        console.log(chalk.underline.bold(pad(`${cluster}`)))
        await f(clusterRepository, cluster)
    }
}

async function podsCommand(clusterRepository: ClusterRepository, cluster: string) {
    const pods = await load(clusterRepository.pods(cluster))
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

async function imagesCommand(imageRepository: ImageRepository) {
    const images = await imageRepository.images()
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

async function deployementsCommand(clusterRepository: ClusterRepository, cluster: string) {
    const deployments = await load(clusterRepository.deployments(cluster))
    logDeploymentHeader()
    deployments.forEach(deployment => {
        logDeployment(deployment)
    })
}

async function deployCommand(clusterRepository: ClusterRepository, imageRepository: ImageRepository) {
    const question = new Question()
    try {
        console.log("Choose the target cluster")
        clusterRepository.clusters.forEach((cluster, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(cluster, 5))
        })
        const targetCluster = await question.choose('> ', clusterRepository.clusters)

        const deployments = await load(clusterRepository.deployments(targetCluster))

        console.log("Choose the target deployment")
        deployments.forEach((deployment, index) => {
            console.log(chalk.bold.cyan(index.toString()) + ": " + pad(deployment.name, 5))
        })
        const targetDeployment = await question.choose('> ', deployments)

        const versions = await imageRepository.versions(targetDeployment.image!.name)
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
            const updated = await clusterRepository.updateDeployment(targetCluster, targetDeployment, targetImage)
            logDeploymentHeader()
            logDeployment(updated)
        }
    } catch (error) {
        console.error(error)
    } finally {
        question.close()
    }
}

async function scalersCommand(clusterRepository: ClusterRepository, cluster: string) {
    const scalers = await load(clusterRepository.scalers(cluster))
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

export function printHelp(clusterRepository?: ClusterRepository, imageRepository?: ImageRepository, invalidConfig: boolean = false) {
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
    if (clusterRepository !== undefined) {
        console.log('configured clusters: ' + m(clusterRepository.clusters.join(", ")))
    } else {
        console.log(c('no clusters configured! (such as your kubernetes)'))
    }
    if (imageRepository !== undefined) {
        console.log('configured image endpoint: ' + m(imageRepository.endpoint))
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

const commands: { [k in Command]: (clusterRepository: ClusterRepository, imageRepository: ImageRepository) => Promise<void> } = {
    "pods": async (clusterRepository: ClusterRepository, { }: ImageRepository) => {
        foreachCluster(clusterRepository, podsCommand)
    },
    "images": async ({ }: ClusterRepository, imageRepository: ImageRepository) => {
        imagesCommand(imageRepository)
    },
    "deployments": async (clusterRepository: ClusterRepository, { }: ImageRepository) => {
        foreachCluster(clusterRepository, deployementsCommand)
    },
    "scalers": async (clusterRepository: ClusterRepository, { }: ImageRepository) => {
        foreachCluster(clusterRepository, scalersCommand)
    },
    "deploy": async (clusterRepository: ClusterRepository, imageRepository: ImageRepository) => {
        deployCommand(clusterRepository, imageRepository)
    },
    "help": async (clusterRepository: ClusterRepository, imageRepository: ImageRepository) => {
        printHelp(clusterRepository, imageRepository)
    }
}

export { commands }
