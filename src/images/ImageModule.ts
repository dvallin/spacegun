import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Request } from "@/dispatcher/model/Request"
import { Component } from "@/dispatcher/component"
import { Layers } from "@/dispatcher/model/Layers"

import { ImageRepository } from "@/images/ImageRepository"
import { Image } from "@/images/model/Image"
import { Tag } from "@/images/model/Tag"

let repo: ImageRepository | undefined = undefined
export function init(repository: ImageRepository) {
    repo = repository
}


export const endpoint: Request<void, string> = {
    module: "images",
    procedure: "endpoint"
}

export const list: Request<void, string[]> = {
    module: "images",
    procedure: "list"
}

export const tags: Request<{ name: string }, Tag[]> = {
    module: "images",
    procedure: "tags",
    input: (input: { name: string } | undefined) => RequestInput.of(["name", input!.name]),
    mapper: (input: RequestInput) => ({ name: input.params!["name"] as string })
}

export const image: Request<{ name: string, tag?: string }, Image> = {
    module: "images",
    procedure: "image",
    input: (input: { name: string, tag?: string } | undefined) => RequestInput.of(
        ["name", input!.name],
        ["tag", input!.tag]
    ),
    mapper: (input: RequestInput) => ({
        name: input.params!["name"] as string,
        tag: input.params!["tag"] as string | undefined
    })
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
        moduleName: list.module,
        layer: Layers.Server
    })
    async [list.procedure](): Promise<string[]> {
        return repo!.list()
    }

    @Component({
        moduleName: tags.module,
        layer: Layers.Server,
        mapper: tags.mapper
    })
    async [tags.procedure](params: { name: string }): Promise<Tag[]> {
        return repo!.tags(params.name)
    }

    @Component({
        moduleName: image.module,
        layer: Layers.Server,
        mapper: image.mapper
    })
    async [image.procedure](params: { name: string, tag?: string }): Promise<Image> {
        return repo!.image(params.name, params.tag)
    }
}
