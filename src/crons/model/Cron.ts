export interface Cron {
    name: string
    isRunning: boolean
    isStarted: boolean
    lastRun: number | undefined
    nextRuns: number[]
}
