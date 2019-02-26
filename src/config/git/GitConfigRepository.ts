import { ConfigRepository } from '../ConfigRepository'
import { Config, GitConfig } from '../index'
import { Layers } from '../../dispatcher/model/Layers'

import * as SimpleGit from 'simple-git/promise'
import * as eventModule from '../../events/EventModule'
import { call } from '../../dispatcher'

export function fromConfig(config: Config): GitConfigRepository | undefined {
    if (config.git && process.env.LAYER === Layers.Server) {
        return new GitConfigRepository(config.configBasePath, config.git)
    }
    return undefined
}

export class GitConfigRepository implements ConfigRepository {
    public readonly git: SimpleGit.SimpleGit

    constructor(basePath: string, public readonly config: GitConfig) {
        this.git = SimpleGit(basePath)
    }

    public async hasNewConfig(): Promise<boolean> {
        if (!(await this.git.checkIsRepo())) {
            await this.git.clone(this.config.remote, './')
            return true
        } else {
            await this.git.fetch()
            const status = await this.git.status()
            return status.behind > 0
        }
    }

    public async fetchNewConfig(): Promise<void> {
        await this.git.pull().catch(reason => GitConfigRepository.logPullErrorToSlack(reason))
    }

    private static logPullErrorToSlack(reason: any): void {
        call(eventModule.log)({
            message: `Failed to pull config repository`,
            timestamp: Date.now(),
            topics: ['slack'],
            description: '',
            fields: [
                {
                    title: 'Reason',
                    value: reason,
                },
            ],
        })
    }
}
