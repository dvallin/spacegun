import { Layers } from "@/dispatcher/model/Layers"

import { load as loadConfig } from "@/config"
import { parse } from "@/options"
import { run as runDispatcher } from "@/dispatcher"

import { init as initJobs } from "@/jobs/JobsModule"
import { init as initCluster } from "@/cluster/ClusterModule"
import { init as initImages } from "@/images/ImageModule"
import { commands, printHelp } from "@/commands"

const options = parse()
const config = loadConfig(options.config)
if (config instanceof Error) {
    printHelp(true)
} else {
    initJobs(config.jobPath)
    initCluster(config.kube)
    initImages(config.docker)

    runDispatcher()
    if (process.env.LAYER === Layers.Standalone || process.env.LAYER === Layers.Client) {
        commands[options.command]()
    }
}
