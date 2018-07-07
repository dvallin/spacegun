import { parse } from "./options"
import { load } from "./config"
import { commands, printHelp } from "./commands"

import { KubernetesClusterProvider } from "./cluster/kubernetes/KubernetesCluster"
import { DockerImageProvider } from "./images/docker/DockerImageProvider"

const options = parse()
const config = load(options.config)
if (config instanceof Error) {
    printHelp(undefined, undefined, true)
} else {
    const clusterProvider = new KubernetesClusterProvider(config.kube)
    const imageProvider = new DockerImageProvider(config.docker)
    commands[options.command](clusterProvider, imageProvider)
}

