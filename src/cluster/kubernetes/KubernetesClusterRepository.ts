import { Pod } from "@/cluster/model/Pod"
import { Image } from "@/cluster/model/Image"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"
import { ClusterRepository } from "@/cluster/ClusterRepository"
const cloneDeep = require("lodash.clonedeep")

import {
    KubeConfig,
    Core_v1Api, V1PodList,
    Apps_v1beta2Api, V1beta2DeploymentList,
    Autoscaling_v1Api, V1HorizontalPodAutoscalerList, V1beta2Deployment, V1Container
} from '@kubernetes/client-node'

interface Api {
    setDefaultAuthentication(config: KubeConfig): void
}

class UpdateDeploymentApi extends Apps_v1beta2Api {
    defaultHeaders = { "content-type": "application/merge-patch+json" }

    constructor(server: string) {
        super(server)
    }
}

export class KubernetesClusterRepository implements ClusterRepository {

    private configs: Map<string, KubeConfig>

    public constructor(configFile: string) {
        const config = new KubeConfig()
        config.loadFromFile(configFile)

        this.configs = new Map()
        for (const contexts of config.getContexts()) {
            const clusterConfig = cloneDeep(config)
            clusterConfig.setCurrentContext(contexts.name)
            this.configs.set(contexts.name, clusterConfig)
        }
    }

    get clusters(): string[] {
        return Array.from(this.configs.keys())
    }

    async pods(cluster: string): Promise<Pod[]> {
        const api = this.build(cluster, (server: string) => new Core_v1Api(server))
        const result: V1PodList = await api.listNamespacedPod("default").get("body")
        return result.items.map(item => {
            const image = this.createImage(item.spec.containers)
            let restarts
            if (item.status.containerStatuses != undefined && item.status.containerStatuses.length >= 1) {
                restarts = item.status.containerStatuses[0].restartCount
            }
            const readyCondition = item.status.conditions.find(c => c.type === 'Ready')
            const ready = readyCondition !== undefined && readyCondition.status === 'True'
            return {
                name: item.metadata.name,
                image, restarts, ready
            }
        })
    }

    async deployments(cluster: string): Promise<Deployment[]> {
        const api = this.build(cluster, (server: string) => new Apps_v1beta2Api(server))
        const result: V1beta2DeploymentList = await api.listNamespacedDeployment("default").get("body")
        return result.items.map(item => {
            const image = this.createImage(item.spec.template.spec.containers)
            return {
                name: item.metadata.name,
                image
            }
        })
    }

    createImage(containers: Array<V1Container> | undefined): Image | undefined {
        if (containers !== undefined && containers.length >= 1) {
            const url = containers[0].image
            const imageAndTag = url.split(":")
            const imageParts = imageAndTag[0].split("/")
            const tag = imageAndTag[1]
            const name = imageParts[imageParts.length - 1]
            return { url, name, tag }
        }
        return undefined
    }

    async updateDeployment(cluster: string, deployment: Deployment, targetImage: Image): Promise<Deployment> {
        const api = this.build(cluster, (server: string) => new UpdateDeploymentApi(server))
        const patch = {
            apiVersion: "apps/v1beta2",
            kind: "Deployment",
            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: deployment.name,
                            image: targetImage.url
                        }]
                    }
                }
            }
        }
        const result: V1beta2Deployment = await api.patchNamespacedDeployment(deployment.name, "default", patch).get("body")
        return {
            name: result.metadata.name,
            image: this.createImage(result.spec.template.spec.containers)
        }
    }

    async scalers(cluster: string): Promise<Scaler[]> {
        const api = this.build(cluster, (server: string) => new Autoscaling_v1Api(server))
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

    private getConfig(cluster: string): KubeConfig {
        const config: KubeConfig | undefined = this.configs.get(cluster)
        if (config === undefined) {
            throw new Error(`Config for cluster ${cluster} could not be found`)
        }
        return config
    }

    private getServer(config: KubeConfig): string {
        return config.getCurrentCluster().server
    }

    private build<T extends Api>(cluster: string, apiProvider: (server: string) => T): T {
        const config: KubeConfig = this.getConfig(cluster)
        const api: T = apiProvider(this.getServer(config))
        api.setDefaultAuthentication(config)
        return api
    }
}
