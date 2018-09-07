import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, jobs, plan, run, schedules } from "../../src/jobs/JobsModule"
import { Job } from "../../src/jobs/model/Job"
import { call } from "../../src/dispatcher"
import { JobsRepository } from "../../src/jobs/JobsRepository"

const planMock = jest.fn()
const applyMock = jest.fn()
const startMock = jest.fn()
const schedulesMock = jest.fn()
const list: Job[] = [
    { name: "job1", cluster: "cluster1", from: { type: "cluster" } },
    { name: "job2", cluster: "cluster2", from: { type: "cluster" } }
]

const repo: JobsRepository = {
    list,
    crons: [],

    plan: planMock,
    schedules: schedulesMock,
    apply: applyMock,
    start: startMock,
}

init(repo)

describe("image module", () => {

    it("calls list", async () => {
        // when
        const result = await call(jobs)()

        // then
        expect(result).toEqual(list)
    })

    it("calls plan", async () => {
        // given
        planMock.mockReturnValueOnce({})

        // when
        const result = await call(plan)({ name: "jobName" })

        // then
        expect(result).toEqual({})
        expect(planMock).toHaveBeenCalledTimes(1)
        expect(planMock).toHaveBeenCalledWith("jobName")
    })

    it("calls schedules", async () => {
        // given
        schedulesMock.mockReturnValueOnce([])

        // when
        const result = await call(schedules)({ name: "jobName" })

        // then
        expect(result).toEqual([])
    })

    it("calls apply", async () => {
        // given
        const plan = {
            deployments: [{
                deployment: { name: "name" },
                image: { url: "url", name: "name", tag: "tag" },
                group: { cluster: "cluster" }
            }], name: "jobName"
        }
        applyMock.mockReturnValueOnce({})

        // when
        const result = await call(run)(plan)

        // then
        expect(result).toEqual({})
        expect(applyMock).toHaveBeenCalledTimes(1)
        expect(applyMock).toHaveBeenCalledWith(plan)
    })
})
