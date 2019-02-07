import { call } from '../../dispatcher'
import { IO } from '../../IO'

import { ServerGroup } from '../../cluster/model/ServerGroup'
import { Deployment } from '../../cluster/model/Deployment'
import * as clusterModule from '../../cluster/ClusterModule'

import { Filter, matchesDeployment, matchesServerGroup } from '../model/Filter'
import { JobPlan } from '../model/JobPlan'
import { DeploymentPlan } from '../model/DeploymentPlan'

export class PlanNamespaceDeployment {
    public constructor(
        readonly name: string,
        readonly sourceCluster: string,
        readonly sourceNamespace: string,
        readonly targetNamespace: string,
        readonly filter?: Partial<Filter>,
        readonly io: IO = new IO()
    ) {}

    public async plan(targetGroup: ServerGroup, name: string, targetDeployments: Deployment[]): Promise<JobPlan> {
        if (!matchesServerGroup({ namespaces: [this.targetNamespace] }, targetGroup)) {
            return { name, deployments: [] }
        }

        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: this.sourceCluster,
            namespace: this.sourceNamespace,
        })

        const deployments: DeploymentPlan[] = []
        for (const targetDeployment of targetDeployments) {
            if (!matchesDeployment(this.filter, targetDeployment)) {
                continue
            }
            this.io.out(`planning namespace deployment ${targetDeployment.name} in ${this.name}`)
            const sourceDeployment = sourceDeployments.find(d => d.name === targetDeployment.name)
            if (sourceDeployment === undefined) {
                this.io.error(
                    `${targetDeployment.name} in {cluster: ${targetGroup.cluster}, namespace: ${targetGroup.namespace}} ` +
                        `has no appropriate deployment in {cluster: ${this.sourceCluster}, namespace: ${this.sourceNamespace}}`
                )
                continue
            }
            if (sourceDeployment.image === undefined) {
                this.io.error(
                    `${targetDeployment.name} in {cluster: ${this.sourceCluster}, namespace: ${this.sourceNamespace}} ` + `has no image`
                )
                continue
            }
            if (targetDeployment.image === undefined || targetDeployment.image.url !== sourceDeployment.image.url) {
                deployments.push({
                    group: targetGroup,
                    deployment: targetDeployment,
                    image: sourceDeployment.image,
                })
            }
        }

        return { name, deployments }
    }
}
