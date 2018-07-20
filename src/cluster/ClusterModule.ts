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

export class Module {

    @Component({
        layer: Layers.Server
    })
    async clusters(): Promise<string[]> {
        return repo!.clusters
    }

    @Component({
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["cluster"]
    })
    async pods(cluster: string): Promise<Pod[]> {
        return repo!.pods(cluster)
    }

    @Component({
        layer: Layers.Server,
        mapper: (p: RequestInput) => ({
            cluster: p.params!["cluster"],
            deployment: p.data.deployment as Deployment,
            targetImage: p.data.targetImage as Image
        }),
        method: Methods.Put
    })
    async updateDeployment(input: { cluster: string, deployment: Deployment, targetImage: Image }): Promise<Deployment> {
        console.log(input)
        return repo!.updateDeployment(input.cluster, input.deployment, input.targetImage)
    }

    @Component({
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["cluster"]
    })
    async deployments(cluster: string): Promise<Deployment[]> {
        return repo!.deployments(cluster)
    }

    @Component({
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["cluster"]
    })
    async scalers(cluster: string): Promise<Scaler[]> {
        return repo!.scalers(cluster)
    }
}
