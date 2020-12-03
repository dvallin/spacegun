import * as moment from 'moment'
import { CronJob } from 'cron'

import { IO } from '../IO'
import { Cron } from './model/Cron'

export class CronRegistry {
    public readonly cronJobs: Map<string, CronJob> = new Map()
    public readonly running: Map<string, Promise<void>> = new Map()
    private readonly io: IO = new IO()

    public register(name: string, cronTime: string, promiseProvider: () => Promise<void>, start: boolean = false) {
        const cron = new CronJob({
            cronTime,
            onTick: () => this.executeTask(name, promiseProvider),
            start,
            timeZone: 'UTC',
        })
        this.cronJobs.set(name, cron)
    }

    public get(name: string): Cron | undefined {
        return this.crons.find(c => c.name === name)
    }

    public get crons(): Cron[] {
        const crons: Cron[] = []
        for (const [name, cron] of this.cronJobs.entries()) {
            const dates = (cron.nextDates(5) as any) || []
            const lastDate = cron.lastDate() as any
            const lastRun = lastDate ? moment(lastDate).valueOf() : undefined
            const nextRuns: number[] = dates.map((d: moment.Moment) => moment(d).valueOf())
            const isRunning = this.running.has(name)
            const isStarted = cron.running === true
            crons.push({ name, lastRun, nextRuns, isRunning, isStarted })
        }
        return crons
    }

    public startAllCrons(): void {
        this.cronJobs.forEach((cronJob, name) => {
            if (!cronJob.running) {
                this.io.out(`starting cron job ${name}`)
                cronJob.start()
            } else {
                this.io.out(`cron job ${name} already started`)
            }
        })
    }

    public stopAllCrons(): void {
        this.cronJobs.forEach(c => c.stop())
        // not waiting for running jobs to finish. because this is how you get deadlocks.
    }

    public removeAllCrons(): void {
        this.stopAllCrons()
        this.cronJobs.clear()
    }

    private async executeTask(name: string, promiseProvider: () => Promise<void>): Promise<void> {
        const currentTask = this.running.get(name)
        if (currentTask !== undefined) {
            this.io.error(`${name} is already running!`)
        } else {
            this.io.out(`executing cron job ${name}`)
            const task = promiseProvider()
            this.running.set(name, task)
            try {
                await task
            } catch (error) {
                this.io.error(error)
            } finally {
                this.running.delete(name)
            }
        }
    }
}
