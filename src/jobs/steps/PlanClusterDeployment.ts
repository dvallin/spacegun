import { IO } from "@/IO"

import { call } from "@/dispatcher"

import * as clusterModule from "@/cluster/ClusterModule"

import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"
import { ServerGroup } from "@/cluster/model/ServerGroup";
import { Deployment } from "@/cluster/model/Deployment";

export class PlanClusterDeployment {

    private readonly io: IO = new IO()

    public constructor(
        readonly name: string,
        readonly cluster: string
    ) { }

    public async plan(group: ServerGroup, targetDeployments: Deployment[]): Promise<DeploymentPlan[]> {
        const deployments: DeploymentPlan[] = []

        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: this.cluster!,
            namespace: group.namespace
        })
        for (const targetDeployment of targetDeployments) {
            this.io.out(`planning cluster deployment ${targetDeployment.name} in ${this.name}`)
            const sourceDeployment = sourceDeployments.find(d => d.name === targetDeployment.name)
            if (sourceDeployment === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no appropriate deployment in cluster ${this.cluster}`)
                continue
            }
            if (sourceDeployment.image === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no image`)
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
