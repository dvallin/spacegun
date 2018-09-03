import { ConfigRepository } from "@/config/ConfigRepository"
import { Config } from "@/config"
import { save, load } from "../index"

export function fromConfig(config: Config): FilesystemConfigRepository {
    return new FilesystemConfigRepository(config.artifacts)
}

export class FilesystemConfigRepository implements ConfigRepository {

    constructor(
        public readonly artifactPath: string
    ) {
    }

    public hasNewConfig(): Promise<boolean> {
        return Promise.resolve(false)
    }

    public fetchNewConfig(): Promise<void> {
        return Promise.resolve()
    }

    public saveArtifact(name: string, path: string, data: object): Promise<void> {
        save(`${this.artifactPath}/${path}/${name}.yml`, data)
        return Promise.resolve()
    }

    public async loadArtifact(name: string, path: string): Promise<object | undefined> {
        try {
            return load(`${this.artifactPath}/${path}/${name}.yml`)
        } catch (e) {
            return undefined
        }
    }
}
