import { IO } from "../../IO"

import { call } from "../../dispatcher"

import * as imageModule from "../../images/ImageModule"

import { DeploymentPlan } from "../model/DeploymentPlan"
import { Deployment } from "../../cluster/model/Deployment"
import { ServerGroup } from "../../cluster/model/ServerGroup"

export type FetchedDeployment = {}

export class PlanImageDeployment {

    private readonly io: IO = new IO()

    public constructor(
        readonly name: string,
        readonly tag: string
    ) { }

    public async plan(group: ServerGroup, targetDeployments: Deployment[]): Promise<DeploymentPlan[]> {
        console.log("enter")
        const deployments: DeploymentPlan[] = []
        for (const targetDeployment of targetDeployments) {
            this.io.out(`planning image deployment ${targetDeployment.name} in ${this.name}`)
            if (targetDeployment.image === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no image, so spacegun cannot determine the right image source`)
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
