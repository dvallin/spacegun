import { load } from "@/jobs"
import { Job } from "@/jobs/model/Job"
import { JobPlan } from "@/jobs/model/JobPlan"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"

import { call } from "@/dispatcher"

import * as clusterModule from "@/cluster/ClusterModule"
import { Deployment } from "@/cluster/model/Deployment"

import * as imageModule from "@/images/ImageModule"
import { JobsRepository } from "@/jobs/JobsRepository"
import { Cron } from "@/jobs/model/Cron"
import { IO } from "@/IO"
import { CronRegistry } from "@/crons/CronRegistry"
import { ServerGroup } from "@/cluster/model/ServerGroup"
import { Layers } from "@/dispatcher/model/Layers"

export class JobsRepositoryImpl implements JobsRepository {

    private readonly io: IO = new IO()

    public static fromConfig(jobsPath: string, cronRegistry: CronRegistry): JobsRepositoryImpl {
        const jobs = load(jobsPath)
        return new JobsRepositoryImpl(jobs, cronRegistry)
    }

    public constructor(
        public readonly jobs: Map<string, Job>,
        private readonly cronRegistry: CronRegistry
    ) {
        if (process.env.LAYER === Layers.Server) {
            Array.from(this.jobs.keys()).forEach(name => {
                const job = this.jobs.get(name)
                if (job !== undefined && job.cron !== undefined) {
                    cronRegistry.register(name, job.cron, () => this.planAndApply(name))
                }
            })
        }
    }

    public get list(): Job[] {
        return Array.from(this.jobs.values())
    }

    public async schedules(name: string): Promise<Cron | undefined> {
        return Promise.resolve(this.cronRegistry.get(name))
    }

    public async start(): Promise<void> {
        this.cronRegistry.startAllCrons()
    }

    public get crons(): Cron[] {
        return this.cronRegistry.crons
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
        const namespaces = await call(clusterModule.namespaces)(job)
        const deployments = await this.planDeploymentForNamespaces(job, namespaces)
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

    async planDeploymentForNamespaces(job: Job, namespaces: string[]): Promise<DeploymentPlan[]> {
        const plannedDeployments = []
        if (namespaces.length === 0) {
            const deployments = await this.planDeployments(job)
            plannedDeployments.push(...deployments)
        } else {
            for (const namespace of namespaces) {
                const deployments = await this.planDeployments(job, namespace)
                plannedDeployments.push(...deployments)
            }
        }
        return plannedDeployments
    }

    async planDeployments(job: Job, namespace?: string): Promise<DeploymentPlan[]> {
        const targetDeployments = await call(clusterModule.deployments)({ cluster: job.cluster, namespace })
        const group: ServerGroup = { cluster: job.cluster, namespace }
        switch (job.from.type) {
            case "cluster": return this.planClusterDeployment(job, targetDeployments, group)
            case "image": return this.planImageDeployment(job, targetDeployments, group)
        }
    }

    async planClusterDeployment(job: Job, targetDeployments: Deployment[], group: ServerGroup): Promise<DeploymentPlan[]> {
        const deployments: DeploymentPlan[] = []
        const sourceDeployments = await call(clusterModule.deployments)({
            cluster: job.from.expression,
            namespace: group.namespace
        })
        for (const targetDeployment of targetDeployments) {
            const sourceDeployment = sourceDeployments.find(d => d.name === targetDeployment.name)
            if (sourceDeployment === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no appropriate deployment in cluster ${job.from.expression}`)
                continue
            }
            if (sourceDeployment.image === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no image`)
                continue
            }
            if (targetDeployment.image === undefined || targetDeployment.image.tag !== sourceDeployment.image.tag) {
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
        const tagMatcher = new RegExp(job.from.expression, "g");

        for (const targetDeployment of targetDeployments) {
            if (targetDeployment.image === undefined) {
                console.error(`${targetDeployment.name} in cluster ${group.cluster} has no image, so spacegun cannot determine the right image source`)
                continue
            }
            const versions = await call(imageModule.versions)(targetDeployment.image)
            const newestImage = versions
                .filter(image => image.tag.match(tagMatcher))
                .reduce((a, b) => a.lastUpdated > b.lastUpdated ? a : b)
            if (targetDeployment.image.tag !== newestImage.tag) {
                deployments.push({
                    group,
                    deployment: targetDeployment,
                    image: newestImage
                })
            }
        }
        return deployments
    }

    async applyDeployment(plan: DeploymentPlan) {
        await call(clusterModule.updateDeployment)(plan)
        this.io.out(`sucessfully updated ${plan.deployment.name} with image ${plan.image.name} in cluster ${plan.group.cluster}`)
    }
}
