import { call } from "../../dispatcher"
import { IO } from "../../IO"

import * as clusterModule from "../../cluster/ClusterModule"

import { DeploymentPlan } from "../model/DeploymentPlan"
import { Deployment } from "../../cluster/model/Deployment"

export class ApplyDeployment {

    private readonly io: IO = new IO()

    public async apply(plan: DeploymentPlan): Promise<Deployment> {
        const deployment = await call(clusterModule.updateDeployment)(plan)
        this.io.out(`sucessfully updated ${deployment.name} with image ${deployment.image!}`)
        return deployment
    }
}
