import { Layers } from "@/dispatcher/model/Layers"

import { load as loadConfig } from "@/config"
import { parse } from "@/options"
import { run as runDispatcher } from "@/dispatcher"
import { commands, printHelp } from "@/commands"
import { IO } from "@/IO"

import { init as initJobs } from "@/jobs/JobsModule"
import { init as initCluster } from "@/cluster/ClusterModule"
import { init as initImages } from "@/images/ImageModule"

import { KubernetesClusterRepository } from "@/cluster/kubernetes/KubernetesClusterRepository"
import { DockerImageRepository } from "@/images/docker/DockerImageRepository"
import { JobsRepositoryImpl } from "@/jobs/JobsRepositoryImpl"

const options = parse()
const config = loadConfig(options.config)
const io = new IO()
try {
    if (config instanceof Error) {
        printHelp(io, true)
    } else {
        initJobs(JobsRepositoryImpl.fromConfig(config.jobs))
        initCluster(KubernetesClusterRepository.fromConfig(config.kube))
        initImages(DockerImageRepository.fromConfig(config.docker))

        runDispatcher(config.server.host, config.server.port)
        if (process.env.LAYER === Layers.Standalone || process.env.LAYER === Layers.Client) {
            commands[options.command](io)
        }
    }
} catch (e) {
    console.error(e)
}
