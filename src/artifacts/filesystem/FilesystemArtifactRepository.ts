import { ArtifactRepository } from '../../artifacts/ArtifactRepository'
import { Config } from '../../config'
import { save, load, list } from '../../file-loading'
import { Artifact } from '../model/Artifact'

export function fromConfig(config: Config): FilesystemArtifactRepository {
    return new FilesystemArtifactRepository(config.artifacts)
}

const YML_EXT: string = '.yml'

export class FilesystemArtifactRepository implements ArtifactRepository {
    constructor(public readonly artifactPath: string) {}

    public saveArtifact(path: string, artifact: Artifact): Promise<void> {
        save(`${this.artifactPath}/${path}/${artifact.name}${YML_EXT}`, artifact.data)
        return Promise.resolve()
    }

    public async listArtifacts(path: string): Promise<Artifact[]> {
        const filenames = list(`${this.artifactPath}/${path}`)
        return filenames
            .filter(name => name.endsWith(YML_EXT))
            .map(name => name.substr(0, name.length - YML_EXT.length))
            .map(name => ({
                name,
                data: load(`${this.artifactPath}/${path}/${name}${YML_EXT}`),
            }))
    }
}
