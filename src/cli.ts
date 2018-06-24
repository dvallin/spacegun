import { parse } from "./options"
import { KubernetesClusterProvider } from './cluster/kubernetes/KubernetesCluster'
import { commands } from "./commands"

(async () => {
    const options = parse()
    const cluster = new KubernetesClusterProvider(options.kube)
    try {
        await commands[options.command](cluster)
    } catch (error) {
        console.error(`Command ${options.command} failed: ${error}`)
    }
})()
