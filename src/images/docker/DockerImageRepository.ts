import axios from "axios"

import { ImageRepository } from "@/images/ImageRepository"
import { Image } from "@/images/model/Image"
import { Cache } from "@/Cache"

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

export class DockerImageRepository implements ImageRepository {

    private imageCache: Cache<null, string[]> = new Cache(60)
    private versionsCache: Cache<string, Image[]> = new Cache(60)

    public constructor(
        public endpoint: string
    ) { }

    public get repository(): string {
        return this.endpoint.split("://")[1]
    }

    public async images(): Promise<string[]> {
        return this.imageCache.calculate(null, async () => {
            const repositories = await axios.get<DockerRepositoriesResponse>(
                `${this.endpoint}/v2/_catalog`
            )
            return await repositories.data.repositories
        })
    }

    public async versions(name: string): Promise<Image[]> {
        return this.versionsCache.calculate(name, async () => {
            const tags = await axios.get<DockerTagsResponse>(
                `${this.endpoint}/v2/${name}/tags/list`
            )
            return Promise.all(tags.data.tags.map(async (tag) => {
                const lastUpdated = await this.lastUpdated(name, tag)
                const url = this.createUrl(name, tag)
                return { url, name, tag, lastUpdated }
            }))
        })
    }

    public async fillCache(): Promise<void> {
    }

    private createUrl(name: string, tag: string): string {
        return `${this.repository}/${name}:${tag}`
    }

    private async lastUpdated(name: string, tag: string): Promise<number> {
        const manifest = await axios.get<DockerManifestsReponse>(
            `${this.endpoint}/v2/${name}/manifests/${tag}`
        )
        return manifest.data.history
            .map(update => JSON.parse(update.v1Compatibility) as DockerV1ManifestLayer)
            .map(layer => Date.parse(layer.created))
            .reduce((a, b) => a > b ? a : b)
    }
}
