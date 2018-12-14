import { RequestInput } from "../dispatcher/model/RequestInput"
import { Request } from "../dispatcher/model/Request"
import { Component } from "../dispatcher/component"
import { Layers } from "../dispatcher/model/Layers"
import { Methods } from "../dispatcher/model/Methods"

import { ArtifactRepository } from "./ArtifactRepository"
import { Artifact } from "./model/Artifact"

let repo: ArtifactRepository | undefined = undefined
export function init(artifactRepository: ArtifactRepository) {
    repo = artifactRepository
}

export interface SaveArtifactParameters {
    artifact: Artifact
    path: string
}

export interface LoadArtifactParameters {
    name: string
    path: string
}

export const saveArtifact: Request<SaveArtifactParameters, void> = {
    module: "artifacts",
    procedure: "saveArtifact",
    input: (input: SaveArtifactParameters | undefined) => RequestInput.ofData(
        input!.artifact.data, ["path", input!.path], ["name", input!.artifact.name]
    ),
    mapper: (input: RequestInput) => ({
        path: input.params!["path"] as string,
        artifact: {
            data: input.data,
            name: input.params!["name"] as string
        }
    })
}

export const listArtifacts: Request<string, Artifact[]> = {
    module: "artifacts",
    procedure: "listArtifacts",
    input: (input: string | undefined) => RequestInput.of(["path", input!]),
    mapper: (input: RequestInput) => input.params!["path"] as string
}

export class Module {

    @Component({
        moduleName: saveArtifact.module,
        layer: Layers.Standalone,
        method: Methods.Post,
        mapper: saveArtifact.mapper
    })
    [saveArtifact.procedure](params: SaveArtifactParameters): Promise<void> {
        return repo!.saveArtifact(params.path, params.artifact)
    }

    @Component({
        moduleName: listArtifacts.module,
        layer: Layers.Standalone,
        method: Methods.Get,
        mapper: listArtifacts.mapper
    })
    [listArtifacts.procedure](path: string | undefined): Promise<Artifact[]> {
        return repo!.listArtifacts(path!)
    }
}
