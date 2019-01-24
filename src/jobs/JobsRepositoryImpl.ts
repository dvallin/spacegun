import { Observable, from, of, empty, OperatorFunction } from 'rxjs'
import { map, mergeMap, catchError } from 'rxjs/operators'

import { load } from '.'
import { PipelineDescription } from './model/PipelineDescription'
import { JobPlan } from './model/JobPlan'
import { DeploymentPlan } from './model/DeploymentPlan'
import { JobsRepository } from './JobsRepository'
import { Cron } from './model/Cron'
import { ApplyDeployment } from './steps/ApplyDeployment'
import { PlanImageDeployment } from './steps/PlanImageDeployment'
import { PlanClusterDeployment } from './steps/PlanClusterDeployment'
import { StepDescription } from './model/Step'

import { call } from '../dispatcher'

import * as clusterModule from '../cluster/ClusterModule'

import { IO } from '../IO'
import { CronRegistry } from '../crons/CronRegistry'
import { Layers } from '../dispatcher/model/Layers'

import { ServerGroup } from '../cluster/model/ServerGroup'
import { Deployment } from '../cluster/model/Deployment'
import { LogError } from './steps/LogError'
import { ClusterProbe } from './steps/ClusterProbe'

const internalLogErrorStep: string = '__internal_log_error'

export class JobsRepositoryImpl implements JobsRepository {
    public readonly io: IO = new IO()

    public static fromConfig(jobsPath: string, cronRegistry: CronRegistry): JobsRepositoryImpl {
        const jobs = load(jobsPath)
        return new JobsRepositoryImpl(jobs, cronRegistry)
    }

    public constructor(public readonly pipelines: Map<string, PipelineDescription>, private readonly cronRegistry: CronRegistry) {
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

    public get crons(): Cron[] {
        return this.cronRegistry.crons
    }

    run(name: string): Observable<void> {
        const pipeline = this.pipelines.get(name)
        if (pipeline) {
            return from(call(clusterModule.namespaces)(pipeline)).pipe(
                mergeMap(namespaces => {
                    if (namespaces.length === 0) {
                        return this.runInNamespace(pipeline)
                    }
                    return of(...namespaces).pipe(mergeMap(namespace => this.runInNamespace(pipeline, namespace)))
                })
            )
        }
        return empty()
    }

    runInNamespace(pipeline: PipelineDescription, namespace?: string): Observable<void> {
        const steps: { [name: string]: StepDescription } = {}
        steps[internalLogErrorStep] = { name: internalLogErrorStep, type: 'logError' }
        for (const step of pipeline.steps) {
            steps[step.name] = step
        }
        const serverGroups = of<ServerGroup>({ cluster: pipeline.cluster, namespace })
        const deployments = serverGroups.pipe(
            mergeMap(group => from(call(clusterModule.deployments)(group)).pipe(map(deployments => ({ group, deployments }))))
        )
        return this.step(pipeline, steps, pipeline.start, deployments as Observable<object>).pipe(map(() => {}))
    }

    step(
        pipeline: PipelineDescription,
        steps: { [name: string]: StepDescription },
        name: string,
        inStream: Observable<object>
    ): Observable<object> {
        const step = steps[name]
        let outStream: Observable<object>
        let stepMapper: OperatorFunction<any, object>
        switch (step.type) {
            case 'planClusterDeployment': {
                const instance = new PlanClusterDeployment(step.name, step.cluster!, step.filter, this.io)
                stepMapper = mergeMap<{ group: ServerGroup; deployments: Deployment[] }, JobPlan>(s =>
                    instance.plan(s.group, name, s.deployments)
                )
                break
            }
            case 'planImageDeployment': {
                const instance = new PlanImageDeployment(step.name, step.tag!, step.semanticTagExtractor, step.filter, this.io)
                stepMapper = mergeMap<{ group: ServerGroup; deployments: Deployment[] }, JobPlan>(s =>
                    instance.plan(s.group, name, s.deployments)
                )
                break
            }
            case 'applyDeployment': {
                const instance = new ApplyDeployment(pipeline.name, this.io)
                stepMapper = mergeMap(s => instance.apply(s))
                break
            }
            case 'logError': {
                const instance = new LogError(this.io)
                stepMapper = mergeMap(s => instance.apply(pipeline, s))
                break
            }
            case 'clusterProbe': {
                const instance = new ClusterProbe()
                stepMapper = mergeMap(s => instance.apply(s, step.hook!, step.timeout))
                break
            }
            default:
                throw new Error(`step type ${step.type} not implemented`)
        }
        outStream = inStream.pipe(
            stepMapper,
            catchError(e => this.step(pipeline, steps, step.onFailure || internalLogErrorStep, of(e)))
        )
        if (step.onSuccess) {
            outStream = this.step(pipeline, steps, step.onSuccess, outStream)
        }
        return outStream
    }

    async plan(name: string): Promise<JobPlan> {
        const pipeline = this.pipelines.get(name)
        if (pipeline === undefined) {
            throw new Error(`could not find job ${name}`)
        }
        const namespaces = await call(clusterModule.namespaces)(pipeline)
        const plan = await this.planDeploymentForNamespaces(pipeline, namespaces)
        this.io.out(`planning finished. ${plan.deployments.length} deployments are planned.`)
        return plan
    }

    async apply(plan: JobPlan): Promise<void> {
        new ApplyDeployment('manual plan').apply(plan)
    }

    async planDeploymentForNamespaces(pipeline: PipelineDescription, namespaces: string[]): Promise<JobPlan> {
        if (namespaces.length === 0) {
            return await this.planDeployments(pipeline)
        } else {
            const deployments: DeploymentPlan[] = []
            for (const namespace of namespaces) {
                try {
                    const plan = await this.planDeployments(pipeline, namespace)
                    deployments.push(...plan.deployments)
                } catch (e) {
                    this.io.error(e)
                }
            }
            return { name: pipeline.name, deployments }
        }
    }

    async planDeployments(pipeline: PipelineDescription, namespace?: string): Promise<JobPlan> {
        let planStep: PlanImageDeployment | PlanClusterDeployment
        let planStepDescription = pipeline.steps.find(s => s.type === 'planImageDeployment' || s.type === 'planClusterDeployment')
        if (planStepDescription !== undefined) {
            if (planStepDescription.type === 'planImageDeployment') {
                planStep = new PlanImageDeployment(
                    pipeline.name,
                    planStepDescription.tag,
                    planStepDescription.semanticTagExtractor,
                    planStepDescription.filter
                )
            } else {
                planStep = new PlanClusterDeployment(pipeline.name, planStepDescription.cluster!, planStepDescription.filter)
            }
        } else {
            throw new Error('pipeline has no plan step')
        }

        const serverGroups = of<ServerGroup>({ cluster: pipeline.cluster, namespace })
        const deployments = serverGroups.pipe(
            mergeMap(group => from(call(clusterModule.deployments)(group)).pipe(map(deployments => ({ group, deployments }))))
        )
        return deployments.pipe(map(d => planStep.plan(d.group, pipeline.name, d.deployments))).toPromise()
    }
}
