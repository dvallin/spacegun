import chalk from "chalk"
import { parse } from "./options"
import { KubernetesClusterProvider } from './cluster/kubernetes/KubernetesCluster'
import { commands } from "./commands"
import { pad } from "./pad"

(async function run() {
    const options = parse()
    const cluster = new KubernetesClusterProvider(options.kube)
    for (const c of cluster.clusters) {
        console.log(chalk.inverse(pad(`Cluster ${c}`)))
        try {
            await commands[options.command](cluster, c)
        } catch (error) {
            console.error(`Command ${options.command} failed: ${error}`)
        }
    }
})()
