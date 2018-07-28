export interface Cron {
    name: string
    lastRun: number | undefined
    nextRuns: number[]
}
