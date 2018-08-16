import { ClusterRepository } from "@/cluster/ClusterRepository"
import { Pod } from "@/cluster/model/Pod"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"
import { Image } from "@/images/model/Image"

import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Component } from "@/dispatcher/component"
import { Layers } from "@/dispatcher/model/Layers"
import { Methods } from "@/dispatcher/model/Methods"
import { ServerGroup } from "@/cluster/model/ServerGroup"

let repo: ClusterRepository | undefined = undefined
export function init(clusterRepository: ClusterRepository) {
    repo = clusterRepository
}

export const moduleName = "cluster"
export const functions = {
    clusters: "clusters",
    namespaces: "namespaces",
    pods: "pods",
    updateDeployment: "updateDeployment",
    deployments: "deployments",
    scalers: "scalers"
}

export interface UpdateDeploymentParameters {
    group: ServerGroup, deployment: Deployment, image: Image
}

export class Module {

    @Component({
        moduleName,
        layer: Layers.Server
    })
    async [functions.clusters](): Promise<string[]> {
        return repo!.clusters
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["cluster"]
    })
    async [functions.namespaces](cluster: string): Promise<string[]> {
        return repo!.namespaces(cluster)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => ({
            cluster: p.params!["cluster"],
            namespace: p.params!["namespace"]
        } as ServerGroup)
    })
    async [functions.pods](group: ServerGroup): Promise<Pod[]> {
        return repo!.pods(group)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput): UpdateDeploymentParameters => ({
            group: {
                cluster: p.params!["cluster"],
                namespace: p.params!["namespace"]
            } as ServerGroup,
            deployment: p.data.deployment as Deployment,
            image: p.data.image as Image
        }),
        method: Methods.Put
    })
    async [functions.updateDeployment](input: UpdateDeploymentParameters): Promise<Deployment> {
        return repo!.updateDeployment(input.group, input.deployment, input.image)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => ({
            cluster: p.params!["cluster"],
            namespace: p.params!["namespace"]
        } as ServerGroup)
    })
    async [functions.deployments](group: ServerGroup): Promise<Deployment[]> {
        return repo!.deployments(group)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => ({
            cluster: p.params!["cluster"],
            namespace: p.params!["namespace"]
        } as ServerGroup)
    })
    async [functions.scalers](group: ServerGroup): Promise<Scaler[]> {
        return repo!.scalers(group)
    }
}
