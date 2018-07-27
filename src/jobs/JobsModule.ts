import { Component } from "@/dispatcher/Component"
import { Layers } from "@/dispatcher/model/Layers"

import { load } from "@/jobs"
import { JobsRepository } from "@/jobs/JobsRepository"
import { JobPlan } from "@/jobs/model/JobPlan"
import { RequestInput } from "@/dispatcher/model/RequestInput"
import { DeploymentPlan } from "@/jobs/model/DeploymentPlan"

let repo: JobsRepository | undefined = undefined
export function init(path: string = "./jobs") {
    repo = new JobsRepository(load(path))
}

export const moduleName = "jobs"
export const functions = {
    jobs: "jobs",
    plan: "plan",
    run: "run"
}

export class Module {

    @Component({
        moduleName,
        layer: Layers.Server
    })
    async [functions.jobs](): Promise<string[]> {
        return repo!.list
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (p: RequestInput) => p.params!["name"]
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
