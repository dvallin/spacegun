import { ArtifactRepository } from "../../artifacts/ArtifactRepository"
import { Config } from "../../config"
import { save, load } from "../../file-loading"

export function fromConfig(config: Config): FilesystemArtifactRepository {
    return new FilesystemArtifactRepository(config.artifacts)
}

export class FilesystemArtifactRepository implements ArtifactRepository {

    constructor(
        public readonly artifactPath: string
    ) {
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
