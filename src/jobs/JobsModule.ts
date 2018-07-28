import { Component } from "@/dispatcher/Component"
import { Layers } from "@/dispatcher/model/Layers"

import { JobsRepository } from "@/jobs/JobsRepository"
import { JobPlan } from "@/jobs/model/JobPlan"
import { RequestInput } from "@/dispatcher/model/RequestInput"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"
import { Job } from "@/jobs/model/Job";
import { Cron } from "@/jobs/model/Cron";

let repo: JobsRepository | undefined = undefined
export function init(jobs: JobsRepository) {
    repo = jobs
}

export const moduleName = "jobs"
export const functions = {
    jobs: "jobs",
    schedules: "schedules",
    plan: "plan",
    run: "run"
}

export class Module {

    @Component({
        moduleName,
        layer: Layers.Server
    })
    async [functions.jobs](): Promise<Job[]> {
        return repo!.list
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["name"][0]
    })
    async [functions.schedules](name: string): Promise<Cron> {
        return repo!.schedules(name)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["name"][0]
    })
    async [functions.plan](name: string): Promise<JobPlan> {
        return repo!.plan(name)
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput): JobPlan => ({
            name: p.params!["name"][0],
            deployments: p.data.deployments as DeploymentPlan[],
        }),
    })
    async [functions.run](plan: JobPlan): Promise<void> {
        return repo!.apply(plan)
    }
}
