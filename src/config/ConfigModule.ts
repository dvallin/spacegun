import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Request } from "@/dispatcher/model/Request"
import { Component } from "@/dispatcher/component"
import { Layers } from "@/dispatcher/model/Layers"
import { Methods } from "@/dispatcher/model/Methods"
import { ConfigRepository } from "@/config/ConfigRepository"

let repo: ConfigRepository | undefined = undefined
export function init(configRepository: ConfigRepository) {
    repo = configRepository
}

export interface SaveArtifactParameters {
    data: object
    name: string
    path: string
}

export interface LoadArtifactParameters {
    name: string
    path: string
}

export const saveArtifact: Request<SaveArtifactParameters, void> = {
    module: "config",
    procedure: "saveArtifact",
    input: (input: SaveArtifactParameters | undefined) => RequestInput.ofData(
        input!.data, ["path", input!.path], ["name", input!.name]
    ),
    mapper: (input: RequestInput) => ({
        data: input.data,
        name: input.params!["name"] as string,
        path: input.params!["path"] as string
    })
}

export const loadArtifact: Request<LoadArtifactParameters, object | undefined> = {
    module: "config",
    procedure: "loadArtifact",
    input: (input: LoadArtifactParameters | undefined) => RequestInput.of(
        ["path", input!.path], ["name", input!.name]
    ),
    mapper: (input: RequestInput) => ({
        name: input.params!["name"] as string,
        path: input.params!["path"] as string
    })
}

export class Module {

    @Component({
        moduleName: saveArtifact.module,
        layer: Layers.Standalone,
        method: Methods.Post,
        mapper: saveArtifact.mapper
    })
    [saveArtifact.procedure](params: SaveArtifactParameters): Promise<void> {
        return repo!.saveArtifact(params.name, params.path, params.data)
    }

    @Component({
        moduleName: loadArtifact.module,
        layer: Layers.Standalone,
        method: Methods.Post,
        mapper: loadArtifact.mapper
    })
    [loadArtifact.procedure](params: LoadArtifactParameters): Promise<object | undefined> {
        return repo!.loadArtifact(params.name, params.path)
    }
}
