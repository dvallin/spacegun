import { JobSource } from "@/jobs/model/JobSource"

export interface Job {
    readonly name: string
    readonly cluster: string
    readonly from: JobSource
    readonly cron?: string
}
