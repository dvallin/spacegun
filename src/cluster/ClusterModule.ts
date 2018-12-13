import { ClusterRepository } from "./ClusterRepository"
import { Pod } from "./model/Pod"
import { Deployment } from "./model/Deployment"
import { Scaler } from "./model/Scaler"
import { Image } from "./model/Image"
import { ServerGroup } from "./model/ServerGroup"
import { ClusterSnapshot } from "./model/ClusterSnapshot"

import { RequestInput } from "../dispatcher/model/RequestInput"
import { Request } from "../dispatcher/model/Request"
import { Component } from "../dispatcher/component"
import { Layers } from "../dispatcher/model/Layers"
import { Methods } from "../dispatcher/model/Methods"

let repo: ClusterRepository | undefined = undefined
export function init(clusterRepository: ClusterRepository) {
    repo = clusterRepository
}

const serverGroupInput = (input: ServerGroup | undefined) => RequestInput.of(
    ["cluster", input!.cluster],
    ["namespace", input!.namespace]
)
const serverGroupMapper = (p: RequestInput) => ({
    cluster: p.params!["cluster"],
    namespace: p.params!["namespace"]
} as ServerGroup)

export const clusters: Request<void, string[]> = {
    module: "cluster",
    procedure: "clusters"
}

export const namespaces: Request<{ cluster: string }, string[]> = {
    module: "cluster",
    procedure: "namespaces",
    input: (input: { cluster: string } | undefined) => RequestInput.of(["cluster", input!.cluster]),
    mapper: (input: RequestInput) => ({ cluster: input.params!["cluster"] as string })
}

export const updateDeployment: Request<UpdateDeploymentParameters, Deployment> = {
    module: "cluster",
    procedure: "updateDeployment",
    input: (input: UpdateDeploymentParameters | undefined) => RequestInput.ofData(
        { deployment: input!.deployment, image: input!.image },
        ["cluster", input!.group.cluster],
        ["namespace", input!.group.namespace]
    ),
    mapper: (p: RequestInput): UpdateDeploymentParameters => ({
        group: {
            cluster: p.params!["cluster"],
            namespace: p.params!["namespace"]
        } as ServerGroup,
        deployment: p.data.deployment as Deployment,
        image: p.data.image as Image
    })
}

export const restartDeployment: Request<RestartDeploymentParameters, Deployment> = {
    module: "cluster",
    procedure: "restartDeployment",
    input: (input: RestartDeploymentParameters | undefined) => RequestInput.ofData(
        { deployment: input!.deployment },
        ["cluster", input!.group.cluster],
        ["namespace", input!.group.namespace]
    ),
    mapper: (p: RequestInput): RestartDeploymentParameters => ({
        group: {
            cluster: p.params!["cluster"],
            namespace: p.params!["namespace"]
        } as ServerGroup,
        deployment: p.data.deployment as Deployment
    })
}

export const pods: Request<ServerGroup, Pod[]> = {
    module: "cluster",
    procedure: "pods",
    input: serverGroupInput,
    mapper: serverGroupMapper
}

export const deployments: Request<ServerGroup, Deployment[]> = {
    module: "cluster",
    procedure: "deployments",
    input: serverGroupInput,
    mapper: serverGroupMapper
}

export const scalers: Request<ServerGroup, Scaler[]> = {
    module: "cluster",
    procedure: "scalers",
    input: serverGroupInput,
    mapper: serverGroupMapper
}

export const takeSnapshot: Request<ServerGroup, ClusterSnapshot> = {
    module: "cluster",
    procedure: "takeSnapshot",
    input: serverGroupInput,
    mapper: serverGroupMapper
}

export const applySnapshot: Request<ApplySnapshotParameters, void> = {
    module: "cluster",
    procedure: "applySnapshot",
    input: (input: ApplySnapshotParameters | undefined) => RequestInput.ofData(
        { snapshot: input!.snapshot },
        ["cluster", input!.group.cluster],
        ["namespace", input!.group.namespace],
        ["ignoreImage", input!.ignoreImage]
    ),
    mapper: (p: RequestInput) => ({
        snapshot: p.data.snapshot as ClusterSnapshot,
        group: {
            cluster: p.params!["cluster"],
            namespace: p.params!["namespace"]
        } as ServerGroup,
        ignoreImage: p.params!["ignoreImage"] === undefined ? undefined : p.params!["ignoreImage"] === "true"
    } as ApplySnapshotParameters)
}

export interface UpdateDeploymentParameters {
    group: ServerGroup, deployment: Deployment, image: Image
}

export interface RestartDeploymentParameters {
    group: ServerGroup, deployment: Deployment
}

export interface ApplySnapshotParameters {
    group: ServerGroup, snapshot: ClusterSnapshot, ignoreImage?: boolean
}

export class Module {

    @Component({
        moduleName: clusters.module,
        layer: Layers.Server
    })
    [clusters.procedure](): Promise<string[]> {
        return Promise.resolve(repo!.clusters)
    }

    @Component({
        moduleName: namespaces.module,
        layer: Layers.Server,
        mapper: namespaces.mapper
    })
    [namespaces.procedure](params: { cluster: string }): Promise<string[]> {
        return repo!.namespaces(params.cluster)
    }

    @Component({
        moduleName: pods.module,
        layer: Layers.Server,
        mapper: pods.mapper
    })
    [pods.procedure](group: ServerGroup): Promise<Pod[]> {
        return repo!.pods(group)
    }

    @Component({
        moduleName: updateDeployment.module,
        layer: Layers.Server,
        mapper: updateDeployment.mapper,
        method: Methods.Put
    })
    [updateDeployment.procedure](input: UpdateDeploymentParameters): Promise<Deployment> {
        return repo!.updateDeployment(input.group, input.deployment, input.image)
    }

    @Component({
        moduleName: restartDeployment.module,
        layer: Layers.Server,
        mapper: restartDeployment.mapper,
        method: Methods.Put
    })
    [restartDeployment.procedure](input: RestartDeploymentParameters): Promise<Deployment> {
        return repo!.restartDeployment(input.group, input.deployment)
    }

    @Component({
        moduleName: deployments.module,
        layer: Layers.Server,
        mapper: deployments.mapper
    })
    [deployments.procedure](group: ServerGroup): Promise<Deployment[]> {
        return repo!.deployments(group)
    }

    @Component({
        moduleName: scalers.module,
        layer: Layers.Server,
        mapper: scalers.mapper
    })
    [scalers.procedure](group: ServerGroup): Promise<Scaler[]> {
        return repo!.scalers(group)
    }

    @Component({
        moduleName: takeSnapshot.module,
        layer: Layers.Server,
        mapper: takeSnapshot.mapper
    })
    [takeSnapshot.procedure](group: ServerGroup): Promise<ClusterSnapshot> {
        return repo!.takeSnapshot(group)
    }

    @Component({
        moduleName: applySnapshot.module,
        layer: Layers.Server,
        mapper: applySnapshot.mapper,
        method: Methods.Put
    })
    [applySnapshot.procedure](params: ApplySnapshotParameters): Promise<void> {
        return repo!.applySnapshot(params.group, params.snapshot, params.ignoreImage === undefined ? true : params.ignoreImage)
    }
}
