import { call } from '../../dispatcher'
import { IO } from '../../IO'

import { ServerGroup } from '../../cluster/model/ServerGroup'
import { Deployment } from '../../cluster/model/Deployment'
import * as clusterModule from '../../cluster/ClusterModule'

import { Filter, matchesServerGroup, matchesResource } from '../model/Filter'
import { JobPlan } from '../model/JobPlan'
import { DeploymentPlan, DeployableResource } from '../model/DeploymentPlan'
import { Batch } from 'src/cluster/model/Batch'

export class PlanNamespaceDeployment {
    public constructor(
        readonly name: string,
        readonly sourceCluster: string,
        readonly sourceNamespace: string,
        readonly targetNamespace: string,
        readonly filter?: Partial<Filter>,
        readonly io: IO = new IO()
    ) {}

    public async plan(targetGroup: ServerGroup, name: string, targetDeployments: Deployment[], targetBatches: Batch[]): Promise<JobPlan> {
        if (!matchesServerGroup({ namespaces: [this.targetNamespace] }, targetGroup)) {
            return { name, deployments: [], batches: [] }
        }

        const deployments = await this.planDeployments(targetGroup, targetDeployments)
        const batches = await this.planBatches(targetGroup, targetBatches)

        return { name, deployments, batches }
    }

    async planDeployments(group: ServerGroup, targetDeployments: Deployment[]): Promise<DeploymentPlan<Deployment>[]> {
        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: this.sourceCluster,
            namespace: this.sourceNamespace,
        })
        return this.planUpdates(group, sourceDeployments, targetDeployments)
    }

    async planBatches(group: ServerGroup, targetBatches: Batch[]): Promise<DeploymentPlan<Batch>[]> {
        const sourceBatches = await call(clusterModule.batches)({
            cluster: this.sourceCluster,
            namespace: this.sourceNamespace,
        })
        return this.planUpdates(group, sourceBatches, targetBatches)
    }

    async planUpdates<T extends DeployableResource>(group: ServerGroup, sources: T[], targets: T[]): Promise<DeploymentPlan<T>[]> {
        const deployments: DeploymentPlan<T>[] = []
        for (const target of targets) {
            if (!matchesResource(this.filter, target)) {
                continue
            }
            this.io.out(`planning namespace deployment ${target.name} in ${this.name}`)
            const source = sources.find(d => d.name === target.name)
            if (source === undefined) {
                this.io.error(
                    `${target.name} in {cluster: ${group.cluster}, namespace: ${group.namespace}} ` +
                        `has no appropriate deployment in {cluster: ${this.sourceCluster}, namespace: ${this.sourceNamespace}}`
                )
                continue
            }
            if (source.image === undefined) {
                this.io.error(`${target.name} in {cluster: ${this.sourceCluster}, namespace: ${this.sourceNamespace}} ` + `has no image`)
                continue
            }
            if (target.image === undefined || target.image.url !== source.image.url) {
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
