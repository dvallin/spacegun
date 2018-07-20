import { Layers } from "@/dispatcher/model/Layers"

import { load } from "@/config"
import { parse } from "@/options"
import { run as runDispatcher } from "@/dispatcher"

import { init as initCluster } from "@/cluster/ClusterModule"
import { init as initImages } from "@/images/ImageModule"
import { commands, printHelp } from "@/commands"

const options = parse()
const config = load(options.config)
if (config instanceof Error) {
    printHelp(true)
} else {
    initCluster(config.kube)
    initImages(config.docker)

    runDispatcher()

    if (process.env.LAYER === Layers.Standalone || process.env.LAYER === Layers.Client) {
        commands[options.command]()
    }
}
