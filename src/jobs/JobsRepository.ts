import { JobPlan } from "@/jobs/model/JobPlan"
import { Cron } from "@/jobs/model/Cron"
import { PipelineDescription } from "@/jobs/model/PipelineDescription"

export interface JobsRepository {

    list: PipelineDescription[]
    crons: Cron[]

    plan(name: string): Promise<JobPlan>
    schedules(name: string): Promise<Cron | undefined>
    apply(plan: JobPlan): Promise<void>
    start(): Promise<void>
}
