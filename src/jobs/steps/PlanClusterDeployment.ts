import { IO } from '../../IO'

import { call } from '../../dispatcher'

import * as clusterModule from '../../cluster/ClusterModule'
import { ServerGroup } from '../../cluster/model/ServerGroup'
import { Deployment } from '../../cluster/model/Deployment'
import { Filter, matchesResource, matchesServerGroup } from '../model/Filter'

import { DeploymentPlan, DeployableResource } from '../model/DeploymentPlan'
import { JobPlan } from '../model/JobPlan'
import { Batch } from 'src/cluster/model/Batch'

export class PlanClusterDeployment {
    public constructor(readonly name: string, readonly cluster: string, readonly filter?: Partial<Filter>, readonly io: IO = new IO()) {}

    public async plan(group: ServerGroup, name: string, targetDeployments: Deployment[], targetBatches: Batch[]): Promise<JobPlan> {
        if (!matchesServerGroup(this.filter, group)) {
            return { name, deployments: [], batches: [] }
        }
        const deployments = await this.planDeployments(group, targetDeployments)
        const batches = await this.planBatches(group, targetBatches)
        return { name, deployments, batches }
    }

    async planDeployments(group: ServerGroup, targetDeployments: Deployment[]): Promise<DeploymentPlan<Deployment>[]> {
        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: this.cluster,
            namespace: group.namespace,
        })
        return this.planUpdates(group, sourceDeployments, targetDeployments)
    }

    async planBatches(group: ServerGroup, targetBatches: Batch[]): Promise<DeploymentPlan<Batch>[]> {
        const sourceBatches = await call(clusterModule.batches)({
            cluster: this.cluster,
            namespace: group.namespace,
        })
        return this.planUpdates(group, sourceBatches, targetBatches)
    }

    async planUpdates<T extends DeployableResource>(group: ServerGroup, sources: T[], targets: T[]): Promise<DeploymentPlan<T>[]> {
        const deployments: DeploymentPlan<T>[] = []
        for (const target of targets) {
            if (!matchesResource(this.filter, target)) {
                continue
            }
            this.io.out(`planning cluster deployment ${target.name} in ${this.name}`)
            const source = sources.find(d => d.name === target.name)
            if (source === undefined) {
                this.io.error(`${target.name} in cluster ${group.cluster} has no appropriate deployment in cluster ${this.cluster}`)
                continue
            }
            if (source.image === undefined) {
                this.io.error(`${target.name} in cluster ${this.cluster} has no image`)
                continue
            }
            if (target.image === undefined || source.image.url !== target.image.url) {
                deployments.push({
                    group,
                    deployable: target,
                    image: source.image,
                })
            }
        }
        return deployments
    }
}
