import { Pipe } from "lazy-space"
import { Job } from "@/jobs/model/Job"
import { ServerGroup } from "@/cluster/model/ServerGroup"
import { IO } from "@/IO"

import { call } from "@/dispatcher"

import * as clusterModule from "@/cluster/ClusterModule"
import * as imageModule from "@/images/ImageModule"

import { Deployment } from "@/cluster/model/Deployment"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"
import { Eval, PromiseEval } from "lazy-space/lib/eval"

interface PlanInput {
    job: Job
    namespace?: string
}

export class PlanDeployment extends Pipe<PlanInput, DeploymentPlan[]> {

    private readonly io: IO = new IO()

    public pass(input: PlanInput): Eval<DeploymentPlan[]> {
        const job = input.job
        const namespace = input.namespace

        return new PromiseEval(call(clusterModule.deployments)({ cluster: job.cluster, namespace }))
            .flatMap(targetDeployments => {
                const group: ServerGroup = { cluster: job.cluster, namespace: namespace }

                switch (input.job.from.type) {
                    case "cluster": return new PromiseEval(this.planClusterDeployment(job, targetDeployments, group))
                    case "image": return new PromiseEval(this.planImageDeployment(job, targetDeployments, group))
                }
            })
    }

    async planClusterDeployment(job: Job, targetDeployments: Deployment[], group: ServerGroup): Promise<DeploymentPlan[]> {
        const deployments: DeploymentPlan[] = []
        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: job.from.expression!,
            namespace: group.namespace
        })
        for (const targetDeployment of targetDeployments) {
            this.io.out(`planning cluster deployment ${targetDeployment.name} in job ${job.name}`)
            const sourceDeployment = sourceDeployments.find(d => d.name === targetDeployment.name)
            if (sourceDeployment === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no appropriate deployment in cluster ${job.from.expression}`)
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

    async planImageDeployment(job: Job, targetDeployments: Deployment[], group: ServerGroup): Promise<DeploymentPlan[]> {
        const deployments: DeploymentPlan[] = []

        for (const targetDeployment of targetDeployments) {
            this.io.out(`planning image deployment ${targetDeployment.name} in job ${job.name}`)
            if (targetDeployment.image === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no image, so spacegun cannot determine the right image source`)
                continue
            }
            const image = await call(imageModule.image)({
                tag: job.from.expression,
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
