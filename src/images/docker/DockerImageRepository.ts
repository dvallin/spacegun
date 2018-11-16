import axios from "axios"

import { ImageRepository } from "../../images/ImageRepository"
import { Image } from "../../images/model/Image"
import { Cache } from "../../Cache"
import { Tag } from "../../images/model/Tag"

interface DockerRepositoriesResponse {
    repositories: string[]
}

interface DockerTagsResponse {
    name: string
    tags: string[]
}

export class DockerImageRepository implements ImageRepository {

    private listCache: Cache<null, string[]> = new Cache(30 * 60)
    private tagCache: Cache<string, Tag[]> = new Cache(30 * 60)
    private imageCache: Cache<string, Image> = new Cache(5 * 60)

    public static fromConfig(endpoint: string): DockerImageRepository {
        return new DockerImageRepository(endpoint)
    }

    public constructor(
        public readonly endpoint: string
    ) { }

    public get repository(): string {
        return this.endpoint.split("://")[1]
    }

    public async list(): Promise<string[]> {
        return this.listCache.calculate(null, async () => {
            const repositories = await axios.get<DockerRepositoriesResponse>(`${this.endpoint}/v2/_catalog`)
            return repositories.data.repositories
        })
    }

    public async tags(name: string): Promise<Tag[]> {
        return this.tagCache.calculate(name, async () => {
            const tags = await axios.get<DockerTagsResponse>(`${this.endpoint}/v2/${name}/tags/list`)
            return tags.data.tags
        })
    }

    public async image(name: string, tag: string = "latest"): Promise<Image> {
        return this.imageCache.calculate(`${name}:${tag}`, async () => {
            const manifest = await axios.get(
                `${this.endpoint}/v2/${name}/manifests/${tag}`,
                { headers: { accept: "application/vnd.docker.distribution.manifest.v2+json" } }
            )
            const digest = manifest.headers["docker-content-digest"]
            const url = this.createUrl(name, tag, digest)
            return { name, tag, url }
        })
    }

    private createUrl(name: string, tag: string, digest: string): string {
        return `${this.repository}/${name}:${tag}@${digest}`
    }
}
