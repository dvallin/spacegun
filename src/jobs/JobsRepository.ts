import { JobPlan } from "@/jobs/model/JobPlan"
import { Cron } from "@/jobs/model/Cron"
import { Job } from "@/jobs/model/Job"

export interface JobsRepository {

    list: Job[]
    crons: Cron[]

    plan(name: string): Promise<JobPlan>
    schedules(name: string): Promise<Cron | undefined>
    apply(plan: JobPlan): Promise<void>
    start(): Promise<void>
}
