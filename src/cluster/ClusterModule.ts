import { KubernetesClusterRepository } from "@/cluster/kubernetes/KubernetesClusterRepository"
import { ClusterRepository } from "@/cluster/ClusterRepository"
import { Pod } from "@/cluster/model/Pod"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"
import { Image } from "@/images/model/Image"

import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Component } from "@/dispatcher/Component"
import { Layers } from "@/dispatcher/model/Layers"
import { Methods } from "@/dispatcher/model/Methods"

let repo: ClusterRepository | undefined = undefined
export function init(config: string) {
    repo = new KubernetesClusterRepository(config)
}

export const moduleName = "cluster"
export const functions = {
    clusters: "clusters",
    pods: "pods",
    updateDeployment: "updateDeployment",
    deployments: "deployements",
    scalers: "scalers"
}

export interface UpdateDeploymentParameters {
    cluster: string, deployment: Deployment, image: Image
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
    async [functions.pods](cluster: string): Promise<Pod[]> {
        return repo!.pods(cluster)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => ({
            cluster: p.params!["cluster"],
            deployment: p.data.deployment as Deployment,
            image: p.data.image as Image
        }),
        method: Methods.Put
    })
    async [functions.updateDeployment](input: UpdateDeploymentParameters): Promise<Deployment> {
        return repo!.updateDeployment(input.cluster, input.deployment, input.image)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["cluster"]
    })
    async [functions.deployments](cluster: string): Promise<Deployment[]> {
        return repo!.deployments(cluster)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["cluster"]
    })
    async [functions.scalers](cluster: string): Promise<Scaler[]> {
        return repo!.scalers(cluster)
    }
}
