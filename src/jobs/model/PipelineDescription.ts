import { StepDescription } from './Step'

export interface PipelineDescription {
    readonly name: string
    readonly cluster: string
    readonly cron?: string
    readonly start: string
    readonly steps: StepDescription[]
}
