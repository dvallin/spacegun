import { IO } from "../../IO"

import { call } from "../../dispatcher"

import * as imageModule from "../../images/ImageModule"

import { DeploymentPlan } from "../model/DeploymentPlan"
import { Deployment } from "../../cluster/model/Deployment"
import { ServerGroup } from "../../cluster/model/ServerGroup"
import { Filter, matchesDeployment, matchesServerGroup } from "../model/Filter"

export type FetchedDeployment = {}

export class PlanImageDeployment {

    public readonly io: IO = new IO()

    public constructor(
        readonly name: string,
        readonly tag: string,
        readonly filter?: Partial<Filter>
    ) { }

    public async plan(group: ServerGroup, targetDeployments: Deployment[]): Promise<DeploymentPlan[]> {
        if (!matchesServerGroup(this.filter, group)) {
            return []
        }

        const deployments: DeploymentPlan[] = []
        for (const targetDeployment of targetDeployments) {
            if (!matchesDeployment(this.filter, targetDeployment)) {
                continue
            }
            this.io.out(`planning image deployment ${targetDeployment.name} in ${this.name}`)
            if (targetDeployment.image === undefined) {
                this.io.error(`${targetDeployment.name} in cluster ${group.cluster} has no image, so spacegun cannot determine the right image source`)
                continue
            }
            const image = await call(imageModule.image)({
                tag: this.tag!,
                name: targetDeployment.image.name
            })
            if (targetDeployment.image.url !== image.url) {
                deployments.push({
                    group,
                    image,
                    deployment: targetDeployment,
                })
            }
        }
        return deployments
    }
}
