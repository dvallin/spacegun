import { load } from "@/config"
import { run as runDispatcher } from "@/dispatcher"

import { init as initCluster } from "@/cluster/ClusterModule"
import { init as initImages } from "@/images/ImageModule"

export function run() {
    const config = load()
    if (config instanceof Error) {
        console.error(config)
    } else {
        initCluster(config.kube)
        initImages(config.docker)
    }
    runDispatcher()
}
