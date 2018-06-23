import { Cluster, Pod, Deployment, Scaler } from "@/cluster/Cluster"

import {
    KubeConfig,
    Core_v1Api, V1PodList,
    Apps_v1beta2Api, V1beta2DeploymentList,
    Autoscaling_v1Api, V1HorizontalPodAutoscalerList
} from '@kubernetes/client-node'

export class KubernetesCluster implements Cluster {

    private config: KubeConfig

    public constructor(configFile: string) {
        this.config = new KubeConfig()
        this.config.loadFromFile(configFile)
    }

    get clusters(): string[] {
        return this.config.contexts.map(context => context.name)
    }

    getServer(cluster: string): string {
        const context = this.config.contexts.filter(c => c.name === cluster)[0]
        return this.config.clusters.filter(c => c.name === context.cluster)[0].server
    }

    async pods(cluster: string): Promise<Pod[]> {
        const api = new Core_v1Api(this.getServer(cluster))
        api.setDefaultAuthentication(this.config)
        const result: V1PodList = await api.listNamespacedPod("default").get("body")
        return result.items.map(item => ({
            name: item.metadata.name,
            image: item.spec.containers[0].image,
            restarts: item.status.containerStatuses[0].restartCount
        }))
    }

    async deployments(cluster: string): Promise<Deployment[]> {
        const api = new Apps_v1beta2Api(this.getServer(cluster))
        api.setDefaultAuthentication(this.config)
        const result: V1beta2DeploymentList = await api.listNamespacedDeployment("default").get("body")
        return result.items.map(item => ({
            name: item.metadata.name,
            image: item.spec.template.spec.containers[0].image
        }))
    }

    async scalers(cluster: string): Promise<Scaler[]> {
        const api = new Autoscaling_v1Api(this.getServer(cluster))
        api.setDefaultAuthentication(this.config)
        const result: V1HorizontalPodAutoscalerList = await api.listNamespacedHorizontalPodAutoscaler("default").get("body")
        return result.items.map(item => ({
            name: item.metadata.name,
            replicas: {
                current: item.status.currentReplicas,
                minimum: item.spec.minReplicas,
                maximum: item.spec.maxReplicas
            }
        }))
    }
}
