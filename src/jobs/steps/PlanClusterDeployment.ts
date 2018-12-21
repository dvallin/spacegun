import { IO } from "../../IO"

import { call } from "../../dispatcher"

import * as clusterModule from "../../cluster/ClusterModule"
import { ServerGroup } from "../../cluster/model/ServerGroup"
import { Deployment } from "../../cluster/model/Deployment"
import { Filter, matchesServerGroup, matchesDeployment } from "../model/Filter"

import { DeploymentPlan } from "../model/DeploymentPlan"

export class PlanClusterDeployment {

    public readonly io: IO = new IO()

    public constructor(
        readonly name: string,
        readonly cluster: string,
        readonly filter?: Partial<Filter>
    ) { }

    public async plan(group: ServerGroup, targetDeployments: Deployment[]): Promise<DeploymentPlan[]> {
        if (!matchesServerGroup(this.filter, group)) {
            return []
        }

        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: this.cluster!,
            namespace: group.namespace
        })

        const deployments: DeploymentPlan[] = []
        for (const targetDeployment of targetDeployments) {
            if (!matchesDeployment(this.filter, targetDeployment)) {
                continue
            }
            this.io.out(`planning cluster deployment ${targetDeployment.name} in ${this.name}`)
            const sourceDeployment = sourceDeployments.find(d => d.name === targetDeployment.name)
            if (sourceDeployment === undefined) {
                this.io.error(`${targetDeployment.name} in cluster ${group.cluster} has no appropriate deployment in cluster ${this.cluster}`)
                continue
            }
            if (sourceDeployment.image === undefined) {
                this.io.error(`${targetDeployment.name} in cluster ${group.cluster} has no image`)
                continue
            }
            if (targetDeployment.image === undefined || targetDeployment.image.url !== sourceDeployment.image.url) {
                deployments.push({
                    group,
                    deployment: targetDeployment,
                    image: sourceDeployment.image
                })
            }
        }
        return deployments
    }
}
