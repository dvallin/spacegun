jest.useFakeTimers()

import { CronRegistry } from '../../src/crons/CronRegistry'

describe('CronRegistry', () => {
    it('registers crons', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve())
        expect(registry.crons).toEqual([
            {
                isRunning: false,
                isStarted: false,
                lastRun: undefined,
                name: 'cron1',
                nextRuns: [1520899201000, 1520899202000, 1520899203000, 1520899204000, 1520899205000],
            },
        ])
    })

    it('starts crons', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve())
        registry.startAllCrons()
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it('starts crons on register if flag is set', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve(), true)
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it('starting them twice does not break anything', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve())
        registry.startAllCrons()
        registry.startAllCrons()
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it('stops crons', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve())
        registry.startAllCrons()
        registry.stopAllCrons()
        expect(registry.crons[0].isStarted).toBeFalsy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it('removes crons', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve())
        registry.removeAllCrons()
        expect(registry.crons).toHaveLength(0)
    })

    it('runs started crons', () => {
        const registry = new CronRegistry()
        registry.register('cron1', '* * * * * *', () => Promise.resolve())
        registry.startAllCrons()

        jest.runOnlyPendingTimers()
        expect(registry.crons[0].lastRun).toBeDefined()
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.running.size).toBe(0)
    })

    it('handles failing crons', async () => {
        const registry = new CronRegistry()
        registry.register('failureCron', '* * * * * *', () => Promise.reject(new Error()))
        await callCronJobCallback(registry, 'failureCron')
        expect(registry.running.size).toBe(0)
    })

    it('does not run crons that are already running', () => {
        const registry = new CronRegistry()
        let runs = 0
        registry.register(
            'cron1',
            '* * * * * *',
            () =>
                new Promise(resolve => {
                    runs++
                    resolve()
                })
        )

        callCronJobCallback(registry, 'cron1')
        expect(runs).toBe(1)
        callCronJobCallback(registry, 'cron1')
        expect(runs).toBe(1)
    })
})

function callCronJobCallback(registry: CronRegistry, name: string): Promise<void> {
    return (registry.cronJobs.get(name) as any)._callbacks[0]()
}
