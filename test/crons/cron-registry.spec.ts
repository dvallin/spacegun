jest.useFakeTimers()

import { CronRegistry } from "../../src/crons/CronRegistry"

describe("CronRegistry", () => {

    it("registers crons", () => {
        const registry = new CronRegistry()
        registry.register("cron1", "* * * * * *", () => Promise.resolve())
        expect(registry.crons).toEqual(
            [{
                isRunning: false, isStarted: false, lastRun: undefined,
                name: "cron1", nextRuns: [
                    1520899200000, 1520899201000, 1520899202000, 1520899203000, 1520899204000
                ]
            }]
        )
    })

    it("starts crons", () => {
        const registry = new CronRegistry()
        registry.register("cron1", "* * * * * *", () => Promise.resolve())
        registry.startAllCrons()
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it("stops crons", () => {
        const registry = new CronRegistry()
        registry.register("cron1", "* * * * * *", () => Promise.resolve())
        registry.startAllCrons()
        registry.stopAllCrons()
        expect(registry.crons[0].isStarted).toBeFalsy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it("removes crons", () => {
        const registry = new CronRegistry()
        registry.register("cron1", "* * * * * *", () => Promise.resolve())
        registry.removeAllCrons()
        expect(registry.crons).toHaveLength(0)
    })

    it("runs started crons", async () => {
        const registry = new CronRegistry()
        const promise: Promise<void> = new Promise((resolve) => setTimeout(() => resolve(), 200))
        registry.register("cron1", "* * * * * *", () => (promise))
        registry.startAllCrons()
        jest.runOnlyPendingTimers()
        expect(registry.crons[0].lastRun).toBeDefined()
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.crons[0].isRunning).toBeTruthy()
        await promise
        expect(registry.crons[0].isStarted).toBeTruthy()
        expect(registry.crons[0].isRunning).toBeFalsy()
    })

    it("does not run crons that are already running", () => {
        const registry = new CronRegistry()
        let runs = 0
        registry.register("cron1", "* * * * * *", () => (new Promise((resolve) => {
            runs++
            resolve()
        })))
        registry.startAllCrons()
        jest.runOnlyPendingTimers()
        expect(runs).toBe(1)
        jest.runOnlyPendingTimers()
        expect(runs).toBe(1)
    })
})
