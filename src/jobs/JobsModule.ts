import { Component } from '../dispatcher/component'
import { RequestInput } from '../dispatcher/model/RequestInput'
import { Request } from '../dispatcher/model/Request'
import { Layers } from '../dispatcher/model/Layers'

import { JobsRepository } from './JobsRepository'
import { JobPlan } from './model/JobPlan'
import { DeploymentPlan } from './model/DeploymentPlan'
import { PipelineDescription } from './model/PipelineDescription'
import { Cron } from './model/Cron'

import { Methods } from '../dispatcher/model/Methods'
import { Deployment } from '../cluster/model/Deployment'
import { Batch } from 'src/cluster/model/Batch'

let repo: JobsRepository | undefined = undefined
export function init(jobs: JobsRepository) {
    repo = jobs
}

export const pipelines: Request<void, PipelineDescription[]> = {
    module: 'jobs',
    procedure: 'pipelines',
}

export const schedules: Request<{ name: string }, Cron | undefined> = {
    module: 'jobs',
    procedure: 'schedules',
    input: (input: { name: string } | undefined) => RequestInput.of(['name', input!.name]),
    mapper: (input: RequestInput) => ({ name: input.params!['name'] as string }),
}

export const plan: Request<{ name: string }, JobPlan> = {
    module: 'jobs',
    procedure: 'plan',
    input: (input: { name: string } | undefined) => RequestInput.of(['name', input!.name]),
    mapper: (input: RequestInput) => ({ name: input.params!['name'] as string }),
}

export const run: Request<JobPlan, Deployment[]> = {
    module: 'jobs',
    procedure: 'run',
    input: (input: JobPlan | undefined) =>
        RequestInput.ofData({ deployments: input!.deployments, batches: input!.batches }, ['name', input!.name]),
    mapper: (input: RequestInput) =>
        ({
            name: input.params!['name'] as string,
            deployments: input.data.deployments as DeploymentPlan<Deployment>[],
            batches: input.data.batches as DeploymentPlan<Batch>[],
        } as JobPlan),
}

export class Module {
    @Component({ moduleName: pipelines.module, layer: Layers.Server })
    async [pipelines.procedure](): Promise<PipelineDescription[]> {
        return repo!.list
    }

    @Component({ moduleName: schedules.module, layer: Layers.Server, mapper: schedules.mapper })
    async [schedules.procedure](params: { name: string }): Promise<Cron | undefined> {
        return repo!.schedules(params.name)
    }

    @Component({ moduleName: plan.module, layer: Layers.Server, mapper: plan.mapper })
    async [plan.procedure](params: { name: string }): Promise<JobPlan> {
        return repo!.plan(params.name)
    }

    @Component({ moduleName: run.module, layer: Layers.Server, mapper: run.mapper, method: Methods.Post })
    async [run.procedure](plan: JobPlan): Promise<Deployment[]> {
        return repo!.apply(plan)
    }
}
