import { ImageProvider, ImageVersion } from "@/images/ImageProvider"
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

    public async images(): Promise<string[]> {
        const repositories = await axios.get<DockerRepositoriesResponse>(
            `${this.endpoint}/v2/_catalog`
        )
        return repositories.data.repositories
    }

    public async versions(image: string): Promise<ImageVersion[]> {
        const tags = await axios.get<DockerTagsResponse>(
            `${this.endpoint}/v2/${image}/tags/list`
        )
        return Promise.all(tags.data.tags.map(async (tag) => {
            const lastUpdated = await this.lastUpdated(image, tag)
            return { image, tag, lastUpdated }
        }))
    }

    private async lastUpdated(image: string, tag: string): Promise<Date> {
        const manifest = await axios.get<DockerManifestsReponse>(
            `${this.endpoint}/v2/${image}/manifests/${tag}`
        )
        return manifest.data.history
            .map(update => JSON.parse(update.v1Compatibility) as DockerV1ManifestLayer)
            .map(layer => new Date(Date.parse(layer.created)))
            .reduce((a, b) => {
                return a.getTime() > b.getDate() ? a : b
            })
    }

}
