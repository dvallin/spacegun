import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Component } from "@/dispatcher/Component"
import { Layers } from "@/dispatcher/model/Layers"

import { DockerImageRepository } from "@/images/docker/DockerImageRepository"
import { ImageRepository } from "@/images/ImageRepository"
import { Image } from "@/cluster/model/Image"

let repo: ImageRepository | undefined = undefined
export function init(config: string) {
    repo = new DockerImageRepository(config)
}

export const moduleName = "images"
export const functions = {
    images: "images",
    versions: "versions",
    endpoint: "endpoint"
}

export class Module {

    @Component({
        moduleName,
        layer: Layers.Server
    })
    async [functions.endpoint](): Promise<string> {
        return repo!.endpoint
    }

    @Component({
        moduleName,
        layer: Layers.Server
    })
    async [functions.images](): Promise<string[]> {
        return repo!.images()
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["name"]
    })
    async [functions.versions](name: string): Promise<Image[]> {
        return repo!.versions(name)
    }
}
