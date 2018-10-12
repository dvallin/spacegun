import { StepDescription } from "@/jobs/model/Step"

export interface PipelineDescription {
    readonly name: string
    readonly cluster: string
    readonly cron?: string
    readonly enter: string
    readonly steps: StepDescription[]
}
