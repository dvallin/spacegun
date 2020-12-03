import {
    KubeConfig,
    CoreV1Api,
    AutoscalingV1Api,
    V1Container,
    V1PodStatus,
    BatchV1beta1Api,
    V1beta1CronJob,
    V1ObjectMeta,
    AppsV1Api,
    V1Deployment,
} from '@kubernetes/client-node'

import * as moment from 'moment'

const cloneDeep = require('lodash.clonedeep')

import { Pod } from '../model/Pod'
import { Image } from '../model/Image'
import { Deployment } from '../model/Deployment'
import { ServerGroup } from '../model/ServerGroup'
import { ClusterSnapshot, Snapshot } from '../model/ClusterSnapshot'
import { Scaler } from '../model/Scaler'
import { ClusterRepository } from '../ClusterRepository'
import { Cache } from '../../Cache'

import { parseImageUrl } from '../../parse-image-url'

import * as eventModule from '../../events/EventModule'

import { call } from '../../dispatcher'
import { Batch } from '../model/Batch'

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
                name: item.metadata!.name!,
                createdAt,
                image,
                restarts,
                ready,
            }
        })
    }

    async deployments(group: ServerGroup): Promise<Deployment[]> {
        const api = this.build(group.cluster, (server: string) => new AppsV1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedDeployment(namespace)
        return result.body.items.map(item => {
            const image = this.createImage(item.spec!.template.spec!.containers)
            return {
                name: item.metadata!.name!,
                image,
            }
        })
    }

    async batches(group: ServerGroup): Promise<Batch[]> {
        const api = this.build(group.cluster, (server: string) => new BatchV1beta1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedCronJob(namespace)
        return result.body.items.map(item => {
            const image = this.createImage(item.spec!.jobTemplate.spec!.template.spec!.containers)
            const schedule = item.spec!.schedule
            const concurrencyPolicy = item.spec!.concurrencyPolicy || 'Allow'
            return {
                name: item.metadata!.name!,
                schedule,
                concurrencyPolicy,
                image,
            }
        })
    }

    async updateBatch(group: ServerGroup, batch: Batch, targetImage: Image): Promise<Batch> {
        return this.replaceBatch(group, batch, d => {
            d.spec!.jobTemplate.spec!.template.spec!.containers[0].image = targetImage.url
        })
    }

    async restartBatch(group: ServerGroup, batch: Batch): Promise<Batch> {
        return this.replaceBatch(group, batch, () => {})
    }

    async scalers(group: ServerGroup): Promise<Scaler[]> {
        const api = this.build(group.cluster, (server: string) => new AutoscalingV1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedHorizontalPodAutoscaler(namespace)
        return result.body.items.map(item => ({
            name: item.metadata!.name!,
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
        const namespace = this.getNamespace(group)
        let deployments: Snapshot[]
        {
            const api = this.build(group.cluster, (server: string) => new AppsV1Api(server))
            const result = await api.listNamespacedDeployment(namespace)
            deployments = result.body.items.map(d => ({
                name: d.metadata!.name!,
                data: this.minifyDeployment(d),
            }))
        }
        let batches: Snapshot[]
        {
            const api = this.build(group.cluster, (server: string) => new BatchV1beta1Api(server))
            const result = await api.listNamespacedCronJob(namespace)
            batches = result.body.items.map(d => ({
                name: d.metadata!.name!,
                data: this.minifyBatch(d),
            }))
        }
        return { batches, deployments }
    }

    async applySnapshot(group: ServerGroup, snapshot: ClusterSnapshot, ignoreImage: boolean): Promise<void> {
        const applied: string[] = []
        const created: string[] = []
        const errored: string[] = []
        await this.applyDeploymentSnapshots(group, snapshot.deployments, ignoreImage, applied, created, errored)
        await this.applyBatchSnapshots(group, snapshot.batches, ignoreImage, applied, created, errored)
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

    async applyDeploymentSnapshots(
        group: ServerGroup,
        deployments: Snapshot[],
        ignoreImage: boolean,
        applied: string[],
        created: string[],
        errored: string[]
    ): Promise<void> {
        const api = this.build(group.cluster, (server: string) => new AppsV1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedDeployment(namespace)
        for (const deployment of deployments) {
            const current = result.body.items.find(d => d.metadata!.name === deployment.name)
            const target = deployment.data as V1Deployment
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
                if (this.deploymentNeedsUpdate(current, target)) {
                    try {
                        await api.replaceNamespacedDeployment(deployment.name, namespace, target)
                        applied.push(`Deployment ${deployment.name}`)
                    } catch (e) {
                        errored.push(`Deployment ${deployment.name}`)
                    }
                }
            }
        }
    }

    async applyBatchSnapshots(
        group: ServerGroup,
        batches: Snapshot[],
        ignoreImage: boolean,
        applied: string[],
        created: string[],
        errored: string[]
    ): Promise<void> {
        const api = this.build(group.cluster, (server: string) => new BatchV1beta1Api(server))
        const namespace = this.getNamespace(group)
        const result = await api.listNamespacedCronJob(namespace)
        for (const deployment of batches) {
            const current = result.body.items.find(d => d.metadata!.name === deployment.name)
            const target = deployment.data as V1beta1CronJob
            if (current === undefined) {
                await api.createNamespacedCronJob(namespace, target)
                created.push(`Batch ${deployment.name}`)
            } else {
                if (ignoreImage) {
                    const image = this.createImage(current.spec!.jobTemplate.spec!.template.spec!.containers)
                    if (image !== undefined) {
                        target.spec!.jobTemplate.spec!.template.spec!.containers[0].image = image.url
                    }
                }
                if (this.batchNeedsUpdate(current, target)) {
                    try {
                        await api.replaceNamespacedCronJob(deployment.name, namespace, target)
                        applied.push(`Batch ${deployment.name}`)
                    } catch (e) {
                        errored.push(`Batch ${deployment.name}`)
                    }
                }
            }
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

    private async replaceDeployment(group: ServerGroup, deployment: Deployment, replacer: (d: V1Deployment) => void): Promise<Deployment> {
        const api = this.build(group.cluster, (server: string) => new AppsV1Api(server))
        const namespace = this.getNamespace(group)
        const response = await api.readNamespacedDeployment(deployment.name, namespace)

        const target = this.minifyDeployment(response.body)
        replacer(target)

        const metadata = target.spec!.template.metadata!
        if (metadata.annotations === undefined) {
            metadata.annotations = {}
        }
        metadata.annotations['spacegun.deployment'] = Date.now().toString()

        let result = await api.replaceNamespacedDeployment(deployment.name, namespace, target)

        return {
            name: result.body.metadata!.name!,
            image: this.createImage(result.body.spec!.template.spec!.containers),
        }
    }

    private async replaceBatch(group: ServerGroup, deployment: Deployment, replacer: (d: V1beta1CronJob) => void): Promise<Batch> {
        const api = this.build(group.cluster, (server: string) => new BatchV1beta1Api(server))
        const namespace = this.getNamespace(group)
        const response = await api.readNamespacedCronJob(deployment.name, namespace)

        const target = this.minifyBatch(response.body)
        replacer(target)

        const metadata = target.spec!.jobTemplate.spec!.template.metadata!
        if (metadata.annotations === undefined) {
            metadata.annotations = {}
        }
        metadata.annotations['spacegun.batch'] = Date.now().toString()

        let result = await api.replaceNamespacedCronJob(deployment.name, namespace, target)

        const schedule = result.body.spec!.schedule
        const concurrencyPolicy = result.body.spec!.concurrencyPolicy || 'Allow'
        const name = result.body.metadata!.name!
        return {
            name,
            schedule,
            concurrencyPolicy,
            image: this.createImage(result.body.spec!.jobTemplate.spec!.template.spec!.containers),
        }
    }

    private minifyDeployment(deployment: V1Deployment): V1Deployment {
        this.cleanMetadata(deployment.metadata)
        if (deployment.spec!) {
            this.cleanMetadata(deployment.spec!.template.metadata)
        }
        return {
            metadata: deployment.metadata,
            spec: deployment.spec,
        } as V1Deployment
    }

    private minifyBatch(batch: V1beta1CronJob): V1beta1CronJob {
        this.cleanMetadata(batch.metadata)
        if (batch.spec) {
            this.cleanMetadata(batch.spec.jobTemplate.metadata)
            if (batch.spec.jobTemplate.spec) {
                this.cleanMetadata(batch.spec.jobTemplate.spec.template.metadata)
            }
        }
        return {
            metadata: batch.metadata,
            spec: batch.spec,
        } as V1beta1CronJob
    }

    private cleanMetadata(metadata: V1ObjectMeta | undefined): void {
        if (metadata === undefined) {
            return
        }
        if (metadata.annotations !== undefined) {
            delete metadata.annotations['deployment.kubernetes.io/revision']
            delete metadata.annotations['spacegun.deployment']
            delete metadata.annotations['spacegun.batch']
        } else {
            metadata.annotations = {}
        }
        delete metadata.uid
        delete metadata.creationTimestamp
        delete metadata.deletionTimestamp
        delete metadata.resourceVersion
        delete metadata.generation
    }

    private deploymentNeedsUpdate(current: V1Deployment, target: V1Deployment): boolean {
        return JSON.stringify(this.minifyDeployment(target)) !== JSON.stringify(this.minifyDeployment(current))
    }

    private batchNeedsUpdate(current: V1beta1CronJob, target: V1beta1CronJob): boolean {
        return JSON.stringify(this.minifyBatch(target)) !== JSON.stringify(this.minifyBatch(current))
    }
}
