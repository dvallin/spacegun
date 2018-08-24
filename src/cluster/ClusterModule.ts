import { ClusterRepository } from "@/cluster/ClusterRepository"
import { Pod } from "@/cluster/model/Pod"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"
import { Image } from "@/cluster/model/Image"

import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Request } from "@/dispatcher/model/Request"
import { Component } from "@/dispatcher/component"
import { Layers } from "@/dispatcher/model/Layers"
import { Methods } from "@/dispatcher/model/Methods"
import { ServerGroup } from "@/cluster/model/ServerGroup"

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

export interface UpdateDeploymentParameters {
    group: ServerGroup, deployment: Deployment, image: Image
}

export class Module {

    @Component({
        moduleName: clusters.module,
        layer: Layers.Server
    })
    async [clusters.procedure](): Promise<string[]> {
        return repo!.clusters
    }

    @Component({
        moduleName: namespaces.module,
        layer: Layers.Server,
        mapper: namespaces.mapper
    })
    async [namespaces.procedure](cluster: string): Promise<string[]> {
        return repo!.namespaces(cluster)
    }

    @Component({
        moduleName: pods.module,
        layer: Layers.Server,
        mapper: pods.mapper
    })
    async [pods.procedure](group: ServerGroup): Promise<Pod[]> {
        return repo!.pods(group)
    }

    @Component({
        moduleName: updateDeployment.module,
        layer: Layers.Server,
        mapper: updateDeployment.mapper,
        method: Methods.Put
    })
    async [updateDeployment.procedure](input: UpdateDeploymentParameters): Promise<Deployment> {
        return repo!.updateDeployment(input.group, input.deployment, input.image)
    }

    @Component({
        moduleName: deployments.module,
        layer: Layers.Server,
        mapper: deployments.mapper
    })
    async [deployments.procedure](group: ServerGroup): Promise<Deployment[]> {
        return repo!.deployments(group)
    }

    @Component({
        moduleName: scalers.module,
        layer: Layers.Server,
        mapper: scalers.mapper
    })
    async [scalers.procedure](group: ServerGroup): Promise<Scaler[]> {
        return repo!.scalers(group)
    }
}
