import { parse } from "./options"
import { load } from "./config"
import { commands, printHelp } from "./commands"

import { KubernetesClusterRepository } from "./cluster/kubernetes/KubernetesClusterRepository"
import { DockerImageRepository } from "./images/docker/DockerImageRepository"

const options = parse()
const config = load(options.config)
if (config instanceof Error) {
    printHelp(undefined, undefined, true)
} else {
    const clusterProvider = new KubernetesClusterRepository(config.kube)
    const imageProvider = new DockerImageRepository(config.docker)
    commands[options.command](clusterProvider, imageProvider)
}

