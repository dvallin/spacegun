import { load } from "@/jobs"
import { PipelineDescription } from "@/jobs/model/PipelineDescription"
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

import { PlanImageDeployment } from "@/jobs/steps/PlanImageDeployment"
import { PlanClusterDeployment } from "@/jobs/steps/PlanClusterDeployment"
import { StepDescription } from "@/jobs/model/Step";
import { Observable } from "rx";
import { ServerGroup } from "@/cluster/model/ServerGroup"
import { Deployment } from "@/cluster/model/Deployment"

export class JobsRepositoryImpl implements JobsRepository {

    private readonly io: IO = new IO()

    public static fromConfig(jobsPath: string, cronRegistry: CronRegistry): JobsRepositoryImpl {
        const jobs = load(jobsPath)
        return new JobsRepositoryImpl(jobs, cronRegistry)
    }

    public constructor(
        public readonly pipelines: Map<string, PipelineDescription>,
        private readonly cronRegistry: CronRegistry
    ) {
        if (process.env.LAYER === Layers.Server) {
            Array.from(this.pipelines.keys()).forEach(name => {
                const job = this.pipelines.get(name)
                if (job !== undefined && job.cron !== undefined) {
                    cronRegistry.register(name, job.cron, () => this.run(name))
                }
            })
        }
    }

    public get list(): PipelineDescription[] {
        return Array.from(this.pipelines.values())
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

    async run(name: string): Promise<void> {
        const pipeline = this.pipelines.get(name)
        if (pipeline) {
            const namespaces = await call(clusterModule.namespaces)(pipeline)
            if (namespaces.length === 0) {
                this.runInNamesspace(pipeline)
            } else {
                for (const namespace of namespaces) {
                    this.runInNamesspace(pipeline, namespace)
                }
            }
        }
    }

    runInNamesspace(pipeline: PipelineDescription, namespace?: string) {
        const steps: { [name: string]: StepDescription } = {}
        for (const step of pipeline.steps) {
            steps[step.name] = step
        }

        const serverGroups = Observable.just<ServerGroup>({ cluster: pipeline.cluster, namespace })
        const deployments = serverGroups.flatMap(group =>
            Observable
                .fromPromise(call(clusterModule.deployments)(group))
                .map(deployments => ({ group, deployments }))
        )
        this.step(steps, pipeline.enter, deployments as Observable<object>).subscribe()
    }

    step(steps: { [name: string]: StepDescription }, name: string, inStream: Observable<object>): Observable<object> {
        const step = steps[name]
        let outStream: Observable<object>

        switch (step.type) {
            case "planClusterDeployment": {
                const instance = new PlanClusterDeployment(step.name, step.cluster!)
                const input = inStream as Observable<{ group: ServerGroup, deployments: Deployment[] }>
                outStream = input.flatMap(s => instance.plan(s.group, s.deployments)) as Observable<object>
                break
            }
            case "planClusterDeployment": {
                const instance = new PlanImageDeployment(step.name, step.cluster!)
                const input = inStream as Observable<{ group: ServerGroup, deployments: Deployment[] }>
                outStream = input.flatMap(s => instance.plan(s.group, s.deployments)) as Observable<object>
                break
            }
            case "applyDeployment": {
                const instance = new ApplyDeployment()
                const input = inStream as Observable<DeploymentPlan>
                outStream = input.flatMap(s => instance.apply(s)) as Observable<object>
                break
            }
            default:
                throw new Error("not implemented")
        }
        if (step.onSuccess) {
            outStream = this.step(steps, step.onSuccess, outStream)
        }
        if (step.onFailure) {
            outStream.doOnError(e => this.step(steps, step.onFailure!, Observable.just(e)))
        }
        return outStream
    }

    async plan(name: string): Promise<JobPlan> {
        const pipeline = this.pipelines.get(name)
        if (pipeline === undefined) {
            throw new Error(`could not find job ${name}`)
        }
        const namespaces = await call(clusterModule.namespaces)(pipeline)
        const deployments = await this.planDeploymentForNamespaces(pipeline, namespaces)
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

    async planDeploymentForNamespaces(pipeline: PipelineDescription, namespaces: string[]): Promise<DeploymentPlan[]> {
        const plannedDeployments = []
        if (namespaces.length === 0) {
            const deployments = await this.planDeployments(pipeline)
            plannedDeployments.push(...deployments)
        } else {
            for (const namespace of namespaces) {
                const deployments = await this.planDeployments(pipeline, namespace)
                plannedDeployments.push(...deployments)
            }
        }
        return plannedDeployments
    }

    async planDeployments(pipeline: PipelineDescription, namespace?: string): Promise<DeploymentPlan[]> {
        let planStep: PlanImageDeployment | PlanClusterDeployment
        let planStepDescription = pipeline.steps.find(s => s.type === "planImageDeployment" || s.type === "planClusterDeployment")
        if (planStepDescription !== undefined) {
            if (planStepDescription.type === "planImageDeployment") {
                planStep = new PlanImageDeployment(pipeline.name, planStepDescription.tag!)
            } else {
                planStep = new PlanClusterDeployment(pipeline.name, planStepDescription.cluster!)
            }
        } else {
            throw new Error("pipeline has no plan step")
        }

        const serverGroups = Observable.just<ServerGroup>({ cluster: pipeline.cluster, namespace })
        const deployments = serverGroups.flatMap(group =>
            Observable
                .fromPromise(call(clusterModule.deployments)(group))
                .map(deployments => ({ group, deployments }))
        )
        return deployments
            .flatMap(d => planStep.plan(d.group, d.deployments))
            .toPromise()
    }

    async applyDeployment(plan: DeploymentPlan): Promise<Deployment> {
        return new ApplyDeployment().apply(plan)
    }
}
