import { JobPlan } from './model/JobPlan'
import { Cron } from './model/Cron'
import { PipelineDescription } from './model/PipelineDescription'

export interface JobsRepository {
    list: PipelineDescription[]
    crons: Cron[]

    plan(name: string): Promise<JobPlan>
    schedules(name: string): Promise<Cron | undefined>
    apply(plan: JobPlan): Promise<void>
}
