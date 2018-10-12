import { Push } from "lazy-space"

import { call } from "@/dispatcher"
import { IO } from "@/IO"

import * as clusterModule from "@/cluster/ClusterModule"

import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"
import { Eval, PromiseEval } from "lazy-space/lib/eval"

export class ApplyDeployment implements Push<DeploymentPlan> {

    private readonly io: IO = new IO()

    push(input: DeploymentPlan): Eval<void> {
        return new PromiseEval(call(clusterModule.updateDeployment)(input))
            .map(() => this.io.out(`sucessfully updated ${input.deployment.name} with image ${input.image.name} in cluster ${input.group.cluster}`))
    }
}
