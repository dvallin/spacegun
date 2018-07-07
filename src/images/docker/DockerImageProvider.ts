import { ImageProvider, ImageVersion } from "../ImageProvider"
import axios from "axios"

interface DockerRepositoriesResponse {
    repositories: string[]
}

interface DockerTagsResponse {
    name: string
    tags: string[]
}

interface DockerManifestsReponse {
    name: string
    tag: string
    history: { v1Compatibility: string }[]
}
interface DockerV1ManifestLayer {
    created: string
}

export class DockerImageProvider implements ImageProvider {

    public constructor(
        public endpoint: string
    ) { }

    public get repository(): string {
        return this.endpoint.split("://")[1]
    }

    public async images(): Promise<string[]> {
        const repositories = await axios.get<DockerRepositoriesResponse>(
            `${this.endpoint}/v2/_catalog`
        )
        return repositories.data.repositories
    }

    public async versions(name: string): Promise<ImageVersion[]> {
        const tags = await axios.get<DockerTagsResponse>(
            `${this.endpoint}/v2/${name}/tags/list`
        )
        return Promise.all(tags.data.tags.map(async (tag) => {
            const lastUpdated = await this.lastUpdated(name, tag)
            const url = this.createUrl(name, tag)
            return { url, name, tag, lastUpdated }
        }))
    }

    private createUrl(name: string, tag: string): string {
        return `${this.repository}/${name}:${tag}`
    }

    private async lastUpdated(name: string, tag: string): Promise<Date> {
        const manifest = await axios.get<DockerManifestsReponse>(
            `${this.endpoint}/v2/${name}/manifests/${tag}`
        )
        return manifest.data.history
            .map(update => JSON.parse(update.v1Compatibility) as DockerV1ManifestLayer)
            .map(layer => new Date(Date.parse(layer.created)))
            .reduce((a, b) => {
                return a.getTime() > b.getDate() ? a : b
            })
    }

}
