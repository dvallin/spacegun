import { JobPlan } from "@/jobs/model/JobPlan"

export interface JobsRepository {

    list: string[]

    planAndApply(name: string): Promise<void>
    plan(name: string): Promise<JobPlan>
    apply(plan: JobPlan): Promise<void>
}
