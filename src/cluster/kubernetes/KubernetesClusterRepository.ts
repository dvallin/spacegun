import {
    KubeConfig,
    CoreV1Api,
    AppsV1beta2Api,
    AutoscalingV1Api,
    V1beta2Deployment,
    V1Container,
    V1PodStatus,
} from '@kubernetes/client-node'

import * as moment from 'moment'

const cloneDeep = require('lodash.clonedeep')

import { Pod } from '../model/Pod'
import { Image } from '../model/Image'
import { Deployment } from '../model/Deployment'
import { ServerGroup } from '../model/ServerGroup'
import { ClusterSnapshot } from '../model/ClusterSnapshot'
import { Scaler } from '../model/Scaler'
import { ClusterRepository } from '../ClusterRepository'
import { Cache } from '../../Cache'

import { parseImageUrl } from '../../parse-image-url'

import * as eventModule from '../../events/EventModule'

import { call } from '../../dispatcher'

interface Api {
    setDefaultAuthentication(config: KubeConfig): void
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

    public constructor(public readonly configs: Map<string, KubeConfig>, private readonly allowedNamespaces: string[] | undefined) {}

    get clusters(): string[] {
        return Array.from(this.configs.keys())
    }

    async namespaces(context: string): Promise<string[]> {
        return this.namespacesCache.calculate(context, async () => {
            const api = this.build(context, (server: string) => new CoreV1Api(server))
            const result = await api.listNamespace()
            return result.body.items
                .map(namespace => namespace.metadata!.name)
                .filter(namespace => this.isNamespaceAllowed(namespace)) as string[]
        })
    }

    async pods(group: ServerGroup): Promise<Pod[]> {
        const api = this.build(group.cluster, (server: string) => new CoreV1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedPod(namespace)
        return result.body.items.map(item => {
            const image = this.createImage(item.spec!.containers)
            const restarts = this.getRestarts(item.status)
            const ready = this.isReady(item.status)
            const createdAt = moment(item.metadata!.creationTimestamp).valueOf()
            return {
                name: item.metadata!.name || '',
                createdAt,
                image,
                restarts,
                ready,
            }
        })
    }

    async deployments(cluster: ServerGroup): Promise<Deployment[]> {
        const api = this.build(cluster.cluster, (server: string) => new AppsV1beta2Api(server))
        const namespace = this.getNamespace(cluster)
        const result = await api.listNamespacedDeployment(namespace)
        return result.body.items.map(item => {
            const image = this.createImage(item.spec!.template.spec!.containers)
            return {
                name: item.metadata!.name || '',
                image,
            }
        })
    }

    async scalers(group: ServerGroup): Promise<Scaler[]> {
        const api = this.build(group.cluster, (server: string) => new AutoscalingV1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedHorizontalPodAutoscaler(namespace)
        return result.body.items.map(item => ({
            name: item.metadata!.name || '',
            replicas: {
                current: item.status!.currentReplicas,
                minimum: item.spec!.minReplicas || 0,
                maximum: item.spec!.maxReplicas,
            },
        }))
    }

    async updateDeployment(group: ServerGroup, deployment: Deployment, targetImage: Image): Promise<Deployment> {
        return this.replaceDeployment(group, deployment, d => {
            d.spec!.template.spec!.containers[0].image = targetImage.url
        })
    }

    async restartDeployment(group: ServerGroup, deployment: Deployment): Promise<Deployment> {
        return this.replaceDeployment(group, deployment, () => {})
    }

    async takeSnapshot(group: ServerGroup): Promise<ClusterSnapshot> {
        const api = this.build(group.cluster, (server: string) => new AppsV1beta2Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedDeployment(namespace)
        return {
            deployments: result.body.items.map(d => ({
                name: d.metadata!.name || '',
                data: this.minifyDeployment(d),
            })),
        }
    }

    async applySnapshot(group: ServerGroup, snapshot: ClusterSnapshot, ignoreImage: boolean): Promise<void> {
        const api = this.build(group.cluster, (server: string) => new AppsV1beta2Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedDeployment(namespace)

        const applied: string[] = []
        const created: string[] = []
        const errored: string[] = []
        for (const deployment of snapshot.deployments) {
            const current = result.body.items.find(d => d.metadata!.name === deployment.name)
            const target = deployment.data as V1beta2Deployment
            if (current === undefined) {
                await api.createNamespacedDeployment(namespace, target)
                created.push(`Deployment ${deployment.name}`)
            } else {
                if (ignoreImage) {
                    const image = this.createImage(current.spec!.template.spec!.containers)
                    if (image !== undefined) {
                        target.spec!.template.spec!.containers[0].image = image.url
                    }
                }
                if (this.needsUpdate(current, target)) {
                    try {
                        await api.replaceNamespacedDeployment(deployment.name, namespace, target)
                        applied.push(`Deployment ${deployment.name}`)
                    } catch (e) {
                        errored.push(`Deployment ${deployment.name}`)
                    }
                }
            }
        }
        if (created.length + applied.length + errored.length > 0) {
            call(eventModule.log)({
                message: `Applied Snapshots`,
                timestamp: Date.now(),
                topics: ['slack'],
                description: `Applied Snapshots in ${group.cluster} ∞ ${group.namespace}`,
                fields: [
                    ...errored.map(value => ({ value, title: 'Failure' })),
                    ...applied.map(value => ({ value, title: 'Updated' })),
                    ...created.map(value => ({ value, title: 'Created' })),
                ],
            })
        }
    }

    private getNamespace(group: ServerGroup): string {
        return group.namespace || 'default'
    }

    private isNamespaceAllowed(namespace: string | undefined): boolean {
        if (namespace === undefined) {
            return false
        }
        return this.allowedNamespaces === undefined || this.allowedNamespaces.find(n => n === namespace) !== undefined
    }

    private isReady(status: V1PodStatus | undefined): boolean {
        if (status === undefined) {
            return false
        }
        const readyCondition = status.conditions && status.conditions.find(c => c.type === 'Ready')
        return readyCondition !== undefined && readyCondition.status === 'True'
    }

    private getRestarts(status: V1PodStatus | undefined): number {
        if (status !== undefined && status.containerStatuses != undefined && status.containerStatuses.length >= 1) {
            return status!.containerStatuses[0].restartCount
        }
        return 0
    }

    private createImage(containers: Array<V1Container> | undefined): Image | undefined {
        if (containers === undefined || containers.length == 0) {
            return undefined
        }

        const url = containers[0].image || ''
        const name = parseImageUrl(url).name
        if (name === undefined) {
            return undefined
        }

        return { url, name }
    }

    private getConfig(cluster: string): KubeConfig {
        const config: KubeConfig | undefined = this.configs.get(cluster)
        if (config === undefined) {
            throw new Error(`Config for cluster ${cluster} could not be found`)
        }
        return config
    }

    private getServer(config: KubeConfig): string {
        return config.getCurrentCluster()!.server
    }

    private build<T extends Api>(cluster: string, apiProvider: (server: string) => T): T {
        const config: KubeConfig = this.getConfig(cluster)
        const api: T = apiProvider(this.getServer(config))
        api.setDefaultAuthentication(config)
        return api
    }

    private async replaceDeployment(
        group: ServerGroup,
        deployment: Deployment,
        replacer: (d: V1beta2Deployment) => void
    ): Promise<Deployment> {
        const api = this.build(group.cluster, (server: string) => new AppsV1beta2Api(server))
        const namespace = this.getNamespace(group)
        const response = await api.readNamespacedDeployment(deployment.name, namespace)

        const target = this.minifyDeployment(response.body)
        replacer(target)

        if (target.spec!.template.metadata!.annotations === undefined) {
            target.spec!.template.metadata!.annotations = {}
        }
        target.spec!.template.metadata!.annotations['spacegun.deployment'] = Date.now().toString()

        let result = await api.replaceNamespacedDeployment(deployment.name, namespace, target)

        return {
            name: result.body.metadata!.name || '',
            image: this.createImage(result.body.spec!.template.spec!.containers),
        }
    }

    private minifyDeployment(deployment: V1beta2Deployment): V1beta2Deployment {
        // delete spacegun related annotations
        if (deployment.spec!.template.metadata!.annotations !== undefined) {
            delete deployment.spec!.template.metadata!.annotations['spacegun.deployment']
        } else {
            deployment.spec!.template.metadata!.annotations = {}
        }
        // delete kubernetes revision annotations
        if (deployment.metadata!.annotations !== undefined) {
            delete deployment.metadata!.annotations['deployment.kubernetes.io/revision']
        } else {
            deployment.metadata!.annotations = {}
        }

        return {
            metadata: {
                name: deployment.metadata!.name,
                namespace: deployment.metadata!.namespace,
                annotations: deployment.metadata!.annotations,
            },
            spec: deployment.spec,
        } as V1beta2Deployment
    }

    private needsUpdate(current: V1beta2Deployment, target: V1beta2Deployment): boolean {
        return JSON.stringify(this.minifyDeployment(target)) !== JSON.stringify(this.minifyDeployment(current))
    }
}
