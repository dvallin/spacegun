import { loadConfig, Config } from './config'
import { commands, printHelp } from './commands'
import { parse } from './options'

import { Layers } from './dispatcher/model/Layers'
import { run as runDispatcher } from './dispatcher'

import { IO } from './IO'
import { CronRegistry } from './crons/CronRegistry'

import { GitConfigRepository, fromConfig as gitRepoFromConfig } from './config/git/GitConfigRepository'

import { fromConfig as artifactRepoFromConfig } from './artifacts/filesystem/FilesystemArtifactRepository'
import { KubernetesClusterRepository } from './cluster/kubernetes/KubernetesClusterRepository'
import { DockerImageRepository } from './images/docker/DockerImageRepository'
import { JobsRepositoryImpl } from './jobs/JobsRepositoryImpl'
import { SlackEventRepository } from './events/slack/SlackEventRepository'

import { init as initArtifacts } from './artifacts/ArtifactModule'
import { init as initCluster } from './cluster/ClusterModule'
import { init as initEvents } from './events/EventModule'
import { init as initImages } from './images/ImageModule'
import { init as initJobs } from './jobs/JobsModule'
import { init as initViews } from './views'

import { Options } from './options'

export class Application {
    public static create(): Application {
        const io = new IO()
        const crons = new CronRegistry()
        const options = parse()
        return new Application(io, crons, options)
    }

    public constructor(public readonly io: IO, public readonly crons: CronRegistry, public readonly options: Options) {}

    public async run() {
        try {
            if (this.options.command !== 'help' && this.options.command !== 'version') {
                const config = loadConfig(this.options.config)
                this.initialize(config)
                runDispatcher(config.server.host, this.options.port || config.server.port)
            }
            if (this.options.command !== undefined) {
                if (process.env.LAYER === Layers.Standalone || process.env.LAYER === Layers.Client) {
                    await commands[this.options.command](this.options, this.io)
                } else {
                    await commands.apply(this.options, this.io)
                }
            } else {
                printHelp(this.io)
            }
        } catch (e) {
            if (this.options.command === undefined || this.options.command === 'help') {
                printHelp(this.io)
            } else {
                printHelp(this.io, e)
            }
        }
    }

    public async checkForConfigChange(git: GitConfigRepository): Promise<void> {
        const hasNewConfig = await git.hasNewConfig()
        if (hasNewConfig) {
            this.io.out('New config found. Will try to load it.')
            await git.fetchNewConfig()
            await this.applyConfiguration()
        }
    }

    private async applyConfiguration(): Promise<void> {
        try {
            const config = loadConfig(this.options.config)
            await this.initialize(config)
            await commands.apply(this.options, this.io)
        } catch (e) {
            this.io.out(`could not reload config ${e.message}`)
        }
    }

    private async initialize(config: Config): Promise<void> {
        if (process.env.LAYER === Layers.Server) {
            this.crons.removeAllCrons()
        }

        initArtifacts(artifactRepoFromConfig(config))
        initViews(config)
        initEvents([SlackEventRepository.fromConfig(config.slack)])
        initCluster(KubernetesClusterRepository.fromConfig(config.kube, config.namespaces))
        initImages(DockerImageRepository.fromConfig(config.docker))

        const jobs = JobsRepositoryImpl.fromConfig(config.pipelines, this.crons)
        initJobs(jobs)

        if (process.env.LAYER === Layers.Server) {
            const gitRepo = gitRepoFromConfig(config)
            if (gitRepo !== undefined) {
                await this.checkForConfigChange(gitRepo)
                this.crons.register('config-reload', config.git!.cron, () => this.checkForConfigChange(gitRepo))
            }
            this.crons.startAllCrons()
        }
    }
}
