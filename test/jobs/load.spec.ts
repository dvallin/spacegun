import { load, validateJob } from "../../src/jobs"
import { Job } from "../../src/jobs/model/Job"

describe("job loading", () => {

    const jobs: Map<string, Job> = load(`${__dirname}/jobs`)

    it("loads jobs", () => {
        expect(jobs.get("job1")).toEqual({
            name: "job1",
            cluster: "someCluster",
            cron: "* * * * 1",
            from: {
                type: "image",
                expression: "^(?!.*latest).*$"
            }
        })
        expect(jobs.get("job2")).toEqual({
            name: "job2",
            cluster: "someCluster",
            from: {
                type: "cluster",
                expression: "someOtherCluster"
            }
        })
    })
})

describe("validateJob", () => {

    it("ensures cluster exists", () => {
        expect(() => validateJob({}, "jobName")).toThrowErrorMatchingSnapshot()
    })

    it("ensures source exists", () => {
        expect(() => validateJob({ cluster: "someCluster" }, "jobName")).toThrowErrorMatchingSnapshot()
    })

    it("ensures source type is correct", () => {
        expect(() => validateJob({ cluster: "someCluster", from: {} }, "jobName")).toThrowErrorMatchingSnapshot()
    })

    describe("image source", () => {

        it("only needs the type", () => {
            expect(() => validateJob({
                cluster: "someCluster", from: {
                    type: "image"
                }
            }, "jobName")).not.toThrow()
        })
    })

    describe("cluster source", () => {

        it("needs a cluster expression", () => {
            expect(() => validateJob({
                cluster: "someCluster", from: {
                    type: "cluster"
                }
            }, "jobName")).toThrowErrorMatchingSnapshot()
        })

        it("needs a cluster expression not equal to its cluster", () => {
            expect(() => validateJob({
                cluster: "someCluster", from: {
                    type: "cluster",
                    expression: "someCluster"
                }
            }, "jobName")).toThrowErrorMatchingSnapshot()
        })
    })
})
