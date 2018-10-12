import { load } from "@/jobs"
import { Job } from "@/jobs/model/Job"
import { JobPlan } from "@/jobs/model/JobPlan"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"

import { call } from "@/dispatcher"

import * as clusterModule from "@/cluster/ClusterModule"

import { JobsRepository } from "@/jobs/JobsRepository"
import { Cron } from "@/jobs/model/Cron"
import { IO } from "@/IO"
import { CronRegistry } from "@/crons/CronRegistry"
import { Layers } from "@/dispatcher/model/Layers"

import * as eventModule from "@/events/EventModule"

import { ApplyDeployment } from "@/jobs/steps/ApplyDeployment"
import { PlanDeployment } from "@/jobs/steps/PlanDeployment"

import { pushOf } from "lazy-space"
import { Eval } from "lazy-space/lib/eval"

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
        this.io.out(`planning finished. ${deployments.length} deployments are planned.`)
        return {
            name,
            deployments
        }
    }

    async apply(plan: JobPlan): Promise<void> {
        for (const deployment of plan.deployments) {
            await this.applyDeployment(deployment)
        }
        call(eventModule.log)({
            message: `Applied job ${plan.name}`,
            timestamp: Date.now(),
            topics: ["slack"],
            description: `Applied ${plan.deployments.length} deployments while executing job ${plan.name}`,
            fields: plan.deployments.map(deployment => ({
                title: `${deployment.group.cluster} ∞ ${deployment.group.namespace} ∞ ${deployment.deployment.name}`,
                value: `updated to ${deployment.image.url}`
            }))
        })
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
        return new Promise<DeploymentPlan[]>(resolve => {
            const step = new PlanDeployment()
            step.subscribe(pushOf(i => {
                resolve(i)
                return Eval.noop()
            }))
            step.push({ job, namespace })
        })
    }

    async applyDeployment(plan: DeploymentPlan) {
        new ApplyDeployment().push(plan)
    }
}
