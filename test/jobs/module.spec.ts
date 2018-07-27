import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { init, moduleName, functions } from "../../src/jobs/JobsModule"
import { get } from "../../src/dispatcher"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"
import { JobsRepository } from "../../src/jobs/JobsRepository"

const list = ["job1", "job2"]
const planAndApply = jest.fn()
const plan = jest.fn()
const apply = jest.fn()
const repo: JobsRepository = {
    list, planAndApply, plan, apply
}

init(repo)

describe("image module", () => {

    it("calls list", () => {
        // when
        const call = get(moduleName, functions.jobs)()

        // then
        expect(call).resolves.toEqual(list)
    })

    it("calls plan", () => {
        // given
        plan.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.plan)(
            RequestInput.of(["name", "jobName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(plan).toHaveBeenCalledTimes(1)
        expect(plan).toHaveBeenCalledWith("jobName")
    })

    it("calls apply", () => {
        // given
        apply.mockReturnValueOnce({})

        // when
        const call = get(moduleName, functions.run)(
            RequestInput.ofData({ deployments: [{}] }, ["name", "jobName"])
        )

        // then
        expect(call).resolves.toEqual({})
        expect(apply).toHaveBeenCalledTimes(1)
        expect(apply).toHaveBeenCalledWith({
            name: "jobName",
            deployments: [{}]
        })
    })
})
