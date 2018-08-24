import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Request } from "@/dispatcher/model/Request"
import { Component } from "@/dispatcher/component"
import { Layers } from "@/dispatcher/model/Layers"

import { ImageRepository } from "@/images/ImageRepository"
import { Image } from "@/images/model/Image"

let repo: ImageRepository | undefined = undefined
export function init(repository: ImageRepository) {
    repo = repository
}

export const images: Request<void, string[]> = {
    module: "images",
    procedure: "images"
}

export const endpoint: Request<void, string> = {
    module: "images",
    procedure: "endpoint"
}

export const versions: Request<{ name: string }, Image[]> = {
    module: "images",
    procedure: "versions",
    input: (input: { name: string } | undefined) => RequestInput.of(["name", input!.name]),
    mapper: (input: RequestInput) => ({ name: input.params!["name"] as string })
}

export class Module {

    @Component({
        moduleName: endpoint.module,
        layer: Layers.Server
    })
    async [endpoint.procedure](): Promise<string> {
        return repo!.endpoint
    }

    @Component({
        moduleName: images.module,
        layer: Layers.Server
    })
    async [images.procedure](): Promise<string[]> {
        return repo!.images()
    }

    @Component({
        moduleName: versions.module,
        layer: Layers.Server,
        mapper: versions.mapper
    })
    async [versions.procedure](params: { name: string }): Promise<Image[]> {
        return repo!.versions(params.name)
    }
}
