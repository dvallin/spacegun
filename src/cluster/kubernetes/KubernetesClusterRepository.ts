import { Pod } from "@/cluster/model/Pod"
import { Image } from "@/cluster/model/Image"
import { Deployment } from "@/cluster/model/Deployment"
import { Scaler } from "@/cluster/model/Scaler"
import { ClusterRepository } from "@/cluster/ClusterRepository"
import { Cache } from "@/Cache"

const cloneDeep = require("lodash.clonedeep")

import {
    KubeConfig,
    Core_v1Api, V1PodList,
    Apps_v1beta2Api, V1beta2DeploymentList,
    Autoscaling_v1Api, V1HorizontalPodAutoscalerList, V1beta2Deployment, V1Container, V1NamespaceList, V1PodStatus
} from '@kubernetes/client-node'
import { ServerGroup } from "@/cluster/model/ServerGroup"
import { ClusterSnapshot } from "@/cluster/model/ClusterSnapshot";

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

    private namespacesCache: Cache<string, string[]> = new Cache(60)

    public static fromConfig(configFile: string, namespaces?: string[]): KubernetesClusterRepository {
        const config = new KubeConfig()
        config.loadFromFile(configFile)
        const configs = new Map()
        for (const contexts of config.getContexts()) {
            const clusterConfig = cloneDeep(config)
            clusterConfig.setCurrentContext(contexts.name)
            configs.set(contexts.name, clusterConfig)
        }
        return new KubernetesClusterRepository(configs, namespaces)
    }

    public constructor(
        public readonly configs: Map<string, KubeConfig>,
        private readonly allowedNamespaces: string[] | undefined
    ) { }

    get clusters(): string[] {
        return Array.from(this.configs.keys())
    }

    async namespaces(context: string): Promise<string[]> {
        return this.namespacesCache.calculate(context, async () => {
            const api = this.build(context, (server: string) => new Core_v1Api(server))
            const result: V1NamespaceList = await api.listNamespace().get("body")
            return result.items
                .map(namespace => namespace.metadata.name)
                .filter(namespace => this.isNamespaceAllowed(namespace))
        })
    }

    async pods(group: ServerGroup): Promise<Pod[]> {
        const api = this.build(group.cluster, (server: string) => new Core_v1Api(server))
        const namespace = this.getNamespace(group)
        const result: V1PodList = await api.listNamespacedPod(namespace).get("body")
        return result.items.map(item => {
            const image = this.createImage(item.spec.containers)
            let restarts
            if (item.status.containerStatuses != undefined && item.status.containerStatuses.length >= 1) {
                restarts = item.status.containerStatuses[0].restartCount
            }
            const ready = this.isReady(item.status)
            return {
                name: item.metadata.name,
                image, restarts, ready
            }
        })
    }

    async deployments(cluster: ServerGroup): Promise<Deployment[]> {
        const api = this.build(cluster.cluster, (server: string) => new Apps_v1beta2Api(server))
        const namespace = this.getNamespace(cluster)
        const result: V1beta2DeploymentList = await api.listNamespacedDeployment(namespace).get("body")
        return result.items.map(item => {
            const image = this.createImage(item.spec.template.spec.containers)
            return {
                name: item.metadata.name,
                image
            }
        })
    }

    async scalers(group: ServerGroup): Promise<Scaler[]> {
        const api = this.build(group.cluster, (server: string) => new Autoscaling_v1Api(server))
        const namespace = this.getNamespace(group)
        const result: V1HorizontalPodAutoscalerList = await api.listNamespacedHorizontalPodAutoscaler(namespace).get("body")
        return result.items.map(item => ({
            name: item.metadata.name,
            replicas: {
                current: item.status.currentReplicas,
                minimum: item.spec.minReplicas,
                maximum: item.spec.maxReplicas
            }
        }))
    }

    async updateDeployment(group: ServerGroup, deployment: Deployment, targetImage: Image): Promise<Deployment> {
        const api = this.build(group.cluster, (server: string) => new UpdateDeploymentApi(server))
        const namespace = this.getNamespace(group)
        const patch = {
            apiVersion: "apps/v1beta2",
            kind: "Deployment",
            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: deployment.name,
                            image: targetImage.url,
                        }]
                    }
                }
            }
        }
        const result: V1beta2Deployment = await api.patchNamespacedDeployment(deployment.name, namespace, patch).get("body")
        return {
            name: result.metadata.name,
            image: this.createImage(result.spec.template.spec.containers)
        }
    }

    async takeSnapshot(group: ServerGroup): Promise<ClusterSnapshot> {
        const api = this.build(group.cluster, (server: string) => new Apps_v1beta2Api(server))
        const namespace = this.getNamespace(group)
        const result: V1beta2DeploymentList = await api.listNamespacedDeployment(namespace).get("body")
        return {
            deployments: result.items.map(d => ({
                name: d.metadata.name,
                data: d
            }))
        }
    }

    async applySnapshot(group: ServerGroup, snapshot: ClusterSnapshot): Promise<void> {
        const api = this.build(group.cluster, (server: string) => new Apps_v1beta2Api(server))
        const namespace = this.getNamespace(group)
        for (const deployment of snapshot.deployments) {
            await api.replaceNamespacedDeployment(
                deployment.name,
                namespace,
                deployment.data as V1beta2Deployment
            )
        }
    }

    private getNamespace(group: ServerGroup): string {
        return group.namespace || "default"
    }

    private isNamespaceAllowed(namespace: string): boolean {
        return this.allowedNamespaces === undefined
            || this.allowedNamespaces.find(n => n === namespace) !== undefined
    }

    private isReady(status: V1PodStatus): boolean {
        const readyCondition = status.conditions && status.conditions.find(c => c.type === 'Ready')
        return readyCondition !== undefined && readyCondition.status === 'True'
    }

    private createImage(containers: Array<V1Container> | undefined): Image | undefined {
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
