import { ClusterProvider, Pod, Deployment, Scaler } from "../Cluster"
const cloneDeep = require("lodash.clonedeep")

import {
    KubeConfig,
    Core_v1Api, V1PodList,
    Apps_v1beta2Api, V1beta2DeploymentList,
    Autoscaling_v1Api, V1HorizontalPodAutoscalerList
} from '@kubernetes/client-node'

interface Api {
    setDefaultAuthentication(config: KubeConfig): void
}

export class KubernetesClusterProvider implements ClusterProvider {

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
            const image = item.spec.containers[0].image
            const tag = image.split(":")[1]
            return {
                name: item.metadata.name,
                image: { image, tag },
                restarts: item.status.containerStatuses[0].restartCount
            }
        })
    }

    async deployments(cluster: string): Promise<Deployment[]> {
        const api = this.build(cluster, (server: string) => new Apps_v1beta2Api(server))
        const result: V1beta2DeploymentList = await api.listNamespacedDeployment("default").get("body")
        return result.items.map(item => {
            const image = item.spec.template.spec.containers[0].image
            const tag = image.split(":")[1]
            return {
                name: item.metadata.name,
                image: { image, tag }
            }
        })
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
