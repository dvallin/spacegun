import { Observable } from "rx"

import { load } from "."
import { PipelineDescription } from "./model/PipelineDescription"
import { JobPlan } from "./model/JobPlan"
import { DeploymentPlan } from "./model/DeploymentPlan"
import { JobsRepository } from "./JobsRepository"
import { Cron } from "./model/Cron"
import { ApplyDeployment } from "./steps/ApplyDeployment"
import { PlanImageDeployment } from "./steps/PlanImageDeployment"
import { PlanClusterDeployment } from "./steps/PlanClusterDeployment"
import { StepDescription } from "./model/Step"

import { call } from "../dispatcher"

import * as clusterModule from "../cluster/ClusterModule"

import { IO } from "../IO"
import { CronRegistry } from "../crons/CronRegistry"
import { Layers } from "../dispatcher/model/Layers"

import * as eventModule from "../events/EventModule"

import { ServerGroup } from "../cluster/model/ServerGroup"
import { Deployment } from "../cluster/model/Deployment"

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
                    cronRegistry.register(name, job.cron, () => this.run(name).toPromise())
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

    run(name: string): Observable<void> {
        const pipeline = this.pipelines.get(name)
        if (pipeline) {
            return Observable.fromPromise(call(clusterModule.namespaces)(pipeline))
                .flatMap(namespaces => {
                    if (namespaces.length === 0) {
                        return this.runInNamespace(pipeline)
                    }
                    return Observable
                        .of(...namespaces)
                        .flatMap(namespace => this.runInNamespace(pipeline, namespace))
                })
                .map(() => { })
        }
        return Observable.of()
    }

    runInNamespace(pipeline: PipelineDescription, namespace?: string): Observable<object> {
        const steps: { [name: string]: StepDescription } = {}
        for (const step of pipeline.steps) {
            steps[step.name] = step
        }

        const serverGroups = Observable.just<ServerGroup>({ cluster: pipeline.cluster, namespace })
        const deployments = serverGroups.flatMap(group => Observable
            .fromPromise(call(clusterModule.deployments)(group))
            .map(deployments => ({ group, deployments }))
        )
        return this.step(steps, pipeline.start, deployments as Observable<object>)
    }

    step(steps: { [name: string]: StepDescription }, name: string, inStream: Observable<object>): Observable<object> {
        const step = steps[name]
        let outStream: Observable<object>

        switch (step.type) {
            case "planClusterDeployment": {
                const instance = new PlanClusterDeployment(step.name, step.cluster!)
                const input = inStream as Observable<{ group: ServerGroup, deployments: Deployment[] }>
                const output: Observable<DeploymentPlan> = input
                    .flatMap(s => instance.plan(s.group, s.deployments))
                    .flatMap(arr => Observable.of(...arr))
                outStream = output as Observable<object>
                break
            }
            case "planImageDeployment": {
                const instance = new PlanImageDeployment(step.name, step.cluster!)
                const input = inStream as Observable<{ group: ServerGroup, deployments: Deployment[] }>
                const output: Observable<DeploymentPlan> = input
                    .flatMap(s => instance.plan(s.group, s.deployments))
                    .flatMap(arr => Observable.of(...arr))
                outStream = output as Observable<object>
                break
            }
            case "applyDeployment": {
                const instance = new ApplyDeployment()
                const input = inStream as Observable<DeploymentPlan>
                outStream = input.flatMap(s => instance.apply(s)) as Observable<object>
                break
            }
            default:
                throw new Error(`step type ${step.type} not implemented`)
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
            message: `Applied pipeline ${plan.name}`,
            timestamp: Date.now(),
            topics: ["slack"],
            description: `Applied ${plan.deployments.length} deployments while executing pipeline ${plan.name}`,
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
                try {
                    const deployments = await this.planDeployments(pipeline, namespace)
                    plannedDeployments.push(...deployments)
                } catch (e) {
                    this.io.error(e)
                }
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
