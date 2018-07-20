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

export class Module {

    @Component({
        layer: Layers.Server
    })
    async images(): Promise<string[]> {
        return repo!.images()
    }

    @Component({
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["name"]
    })
    async versions(name: string): Promise<Image[]> {
        return repo!.versions(name)
    }
}
