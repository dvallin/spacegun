import { CronJob } from "cron"

import { load } from "@/jobs"
import { Job } from "@/jobs/model/Job"
import { JobPlan } from "@/jobs/model/JobPlan"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"

import { get } from "@/dispatcher"
import { RequestInput } from "@/dispatcher/model/RequestInput"

import * as clusterModule from "@/cluster/ClusterModule"
import { Deployment } from "@/cluster/model/Deployment"

import * as imageModule from "@/images/ImageModule"
import { Image } from "@/images/model/Image"
import { JobsRepository } from "@/jobs/JobsRepository";

export class JobsRepositoryImpl implements JobsRepository {

    public readonly cronJobs: CronJob[] = []

    public static fromConfig(jobsPath: string): JobsRepositoryImpl {
        const jobs = load(jobsPath)
        return new JobsRepositoryImpl(jobs)
    }

    public constructor(
        public readonly jobs: Map<string, Job>
    ) {
        Array.from(this.jobs.keys()).forEach(name => {
            const job = this.jobs.get(name)
            if (job !== undefined && job.cron !== undefined) {
                this.cronJobs.push(new CronJob(job.cron, () => this.planAndApply(name)))
            }
        })
    }

    get list(): string[] {
        return Array.from(this.jobs.keys())
    }

    async planAndApply(name: string): Promise<void> {
        const plan = await this.plan(name)
        if (plan.deployments.length > 0) {
            await this.apply(plan)
        }
    }

    async plan(name: string): Promise<JobPlan> {
        const job = this.jobs.get(name)
        if (job === undefined) {
            throw new Error(`could not find job ${name}`)
        }
        const deployments = await this.planDeployments(job)
        return {
            name,
            deployments
        }
    }

    async apply(plan: JobPlan): Promise<void> {
        for (const deployment of plan.deployments) {
            await this.applyDeployment(deployment)
        }
    }

    async planDeployments(job: Job): Promise<DeploymentPlan[]> {
        const deployments: DeploymentPlan[] = []
        const targetDeployments = await get<Deployment[]>(clusterModule.moduleName, clusterModule.functions.deployments)(
            RequestInput.of(["cluster", job.cluster])
        )
        switch (job.from.type) {
            case "cluster": {
                const sourceDeployments = await get<Deployment[]>(clusterModule.moduleName, clusterModule.functions.deployments)(
                    RequestInput.of(["cluster", job.from.expression])
                )
                for (const targetDeployment of targetDeployments) {
                    const sourceDeployment = sourceDeployments.find(d => d.name === targetDeployment.name)
                    if (sourceDeployment === undefined) {
                        console.error(`${targetDeployment.name} in cluster ${job.cluster} has no appropriate deployment in cluster ${job.from.expression}`)
                        continue
                    }
                    if (sourceDeployment.image === undefined) {
                        console.error(`${targetDeployment.name} in cluster ${job.cluster} has no image`)
                        continue
                    }
                    if (targetDeployment.image === undefined || targetDeployment.image.tag !== sourceDeployment.image.tag) {
                        deployments.push({
                            cluster: job.cluster,
                            deployment: targetDeployment,
                            image: sourceDeployment.image
                        })
                    }
                }
                break
            }
            case "image": {
                const tagMatcher = new RegExp(job.from.expression, "g");

                for (const targetDeployment of targetDeployments) {
                    if (targetDeployment.image === undefined) {
                        console.error(`${targetDeployment.name} in cluster ${job.cluster} has no image, so spacegun cannot determine the right image source`)
                        continue
                    }
                    const versions = await get<Image[]>(imageModule.moduleName, imageModule.functions.versions)(
                        RequestInput.of(["name", targetDeployment.image.name])
                    )
                    const newestImage = versions
                        .filter(image => image.tag.match(tagMatcher))
                        .reduce((a, b) => a.lastUpdated > b.lastUpdated ? a : b)
                    if (targetDeployment.image.tag !== newestImage.tag) {
                        deployments.push({
                            cluster: job.cluster,
                            deployment: targetDeployment,
                            image: newestImage
                        })
                    }
                }
                break
            }
        }
        return deployments
    }

    async applyDeployment(plan: DeploymentPlan) {
        await get<Deployment>(clusterModule.moduleName, clusterModule.functions.updateDeployment)(
            RequestInput.ofData({
                cluster: plan.cluster,
                deployment: plan.deployment,
                image: plan.image
            })
        )
        console.log(`sucessfully updated ${plan.deployment.name} with image ${plan.image.name} in cluster ${plan.cluster}`)
    }

}
