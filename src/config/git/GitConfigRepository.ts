import { Config, GitConfig } from "@/config"
import { Layers } from "@/dispatcher/model/Layers"

import * as SimpleGit from "simple-git/promise"
import { FilesystemConfigRepository } from "@/config/filesystem/FilesystemConfigRepository";

export function fromConfig(config: Config): GitConfigRepository | undefined {
    if (config.git && process.env.LAYER === Layers.Server) {
        const g = SimpleGit("./")
        return new GitConfigRepository(g, config.git, config.artifacts)
    }
    return undefined
}

export class GitConfigRepository extends FilesystemConfigRepository {

    constructor(
        public readonly git: SimpleGit.SimpleGit,
        public readonly config: GitConfig,
        artifactPath: string
    ) {
        super(artifactPath)
    }

    public async hasNewConfig(): Promise<boolean> {
        if (!await this.git.checkIsRepo()) {
            await this.git.clone(this.config.remote, "./")
            return true
        } else {
            const status = await this.git.status()
            return status.behind > 0
        }
    }

    public async fetchNewConfig(): Promise<void> {
        await this.git.pull()
    }
}
