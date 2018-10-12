import { Component } from "@/dispatcher/component"
import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Request } from "@/dispatcher/model/Request"
import { Layers } from "@/dispatcher/model/Layers"

import { JobsRepository } from "@/jobs/JobsRepository"
import { JobPlan } from "@/jobs/model/JobPlan"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"
import { PipelineDescription } from "@/jobs/model/PipelineDescription"
import { Cron } from "@/jobs/model/Cron"

let repo: JobsRepository | undefined = undefined
export function init(jobs: JobsRepository) {
    repo = jobs

    if (process.env.LAYER === Layers.Server) {
        repo.start()
    }
}

export const pipelines: Request<void, PipelineDescription[]> = {
    module: "jobs",
    procedure: "pipelines"
}

export const schedules: Request<{ name: string }, Cron | undefined> = {
    module: "jobs",
    procedure: "schedules",
    input: (input: { name: string } | undefined) => RequestInput.of(["name", input!.name]),
    mapper: (input: RequestInput) => ({ name: input.params!["name"] as string })
}

export const plan: Request<{ name: string }, JobPlan> = {
    module: "jobs",
    procedure: "plan",
    input: (input: { name: string } | undefined) => RequestInput.of(["name", input!.name]),
    mapper: (input: RequestInput) => ({ name: input.params!["name"] as string })
}

export const run: Request<JobPlan, void> = {
    module: "jobs",
    procedure: "run",
    input: (input: JobPlan | undefined) => RequestInput.ofData({ deployments: input!.deployments }, ["name", input!.name]),
    mapper: (input: RequestInput) => ({
        name: input.params!["name"] as string,
        deployments: input.data.deployments as DeploymentPlan[],
    } as JobPlan)
}

export class Module {

    @Component({
        moduleName: pipelines.module,
        layer: Layers.Server
    })
    async [pipelines.procedure](): Promise<PipelineDescription[]> {
        return repo!.list
    }

    @Component({
        moduleName: schedules.module,
        layer: Layers.Server,
        mapper: schedules.mapper
    })
    async [schedules.procedure](params: { name: string }): Promise<Cron | undefined> {
        return repo!.schedules(params.name)
    }

    @Component({
        moduleName: plan.module,
        layer: Layers.Server,
        mapper: plan.mapper
    })
    async [plan.procedure](params: { name: string }): Promise<JobPlan> {
        return repo!.plan(params.name)
    }

    @Component({
        moduleName: run.module,
        layer: Layers.Server,
        mapper: run.mapper,
    })
    async [run.procedure](plan: JobPlan): Promise<void> {
        return repo!.apply(plan)
    }
}
