jest.useFakeTimers()
import * as moment from "moment"

import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import { Job } from "../../src/jobs/model/Job"

import * as clusterModule from "../../src/cluster/ClusterModule"
import * as imageModule from "../../src/images/ImageModule"

const deployments = {
    "cluster1": [
        { name: "service1", image: { name: "image1", tag: "tag2" } }
    ],
    "cluster2": [
        { name: "service1", image: { name: "image1", tag: "tag1" } }
    ],
}

const versions = {
    "image1": [
        { tag: "tag3" }
    ]
}

import * as dispatcher from "../../src/dispatcher"
dispatcher.get = (moduleName: string, procedureName: string) => {
    switch (moduleName) {
        case clusterModule.moduleName: {
            switch (procedureName) {
                case clusterModule.functions.deployments: {
                    return (input: RequestInput) => (deployments[input.params["cluster"][0]])
                }
            }
        }
        case imageModule.moduleName: {
            switch (procedureName) {
                case imageModule.functions.versions: {
                    return (input: RequestInput) => (versions[input.params["name"][0]])
                }
            }
        }
    }
}

import { JobsRepositoryImpl } from "../../src/jobs/JobsRepositoryImpl"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"

describe("JobsRepositoryImpl", () => {

    let repo: JobsRepositoryImpl
    const twelvePMEveryWorkday = "0 0 0 12 * * MON-FRI"
    const everyMinuteEveryWorkday = "0 */5 * * * MON-FRI"
    const job1: Job = { name: "1->2", cluster: "cluster2", from: { type: "cluster", expression: "cluster1" }, cron: twelvePMEveryWorkday }
    const job2: Job = { name: "i->1", cluster: "cluster1", from: { type: "image", expression: "^(?!.*latest).*$" }, cron: everyMinuteEveryWorkday }

    beforeEach(() => {
        const jobs = new Map()
        jobs.set("1->2", job1)
        jobs.set("i->1", job2)

        jest.mock("../../src/dispatcher/index", () => ({
            get: jest.fn()
        }))

        repo = new JobsRepositoryImpl(jobs)
    })

    it("registers the job names", () => {
        expect(repo.list).toEqual([job1, job2])
    })

    describe("cron jobs", () => {

        it("updates lastRun", () => {
            expect(repo.crons[0].lastRun).toBeUndefined()
            expect(repo.crons[1].lastRun).toBeUndefined()
            repo.cronJobs.get("1->2").start()
            jest.runOnlyPendingTimers()
            expect(repo.crons[0].lastRun).toBeDefined()
            expect(repo.crons[1].lastRun).toBeUndefined()
        })

        it("shows next five runs", () => {
            expect(repo.crons[0].nextRuns).toEqual(
                [1520942400000, 1521028800000, 1521115200000, 1521201600000, 1521460800000]
            )
            expect(repo.crons[1].nextRuns).toEqual(
                [1520899200000, 1520899500000, 1520899800000, 1520900100000, 1520900400000]
            )
        })

    })

    it("plans a cluster job", async () => {
        // when
        const plan = await repo.plan("1->2")

        // then
        expect(plan.name).toEqual("1->2")
        expect(plan.deployments).toHaveLength(1)

        const deploymentPlan = plan.deployments[0]

        // deploy into cluster2
        expect(deploymentPlan.cluster).toBe("cluster2")

        // service1 gets from tag1 to tag2
        expect(deploymentPlan.image.tag).toBe("tag2")
        expect(deploymentPlan.deployment.name).toBe("service1")
        expect(deploymentPlan.deployment.image.tag).toBe("tag1")
    })

    it("plans an image job", async () => {
        // when
        const plan = await repo.plan("i->1")

        // then
        expect(plan.name).toEqual("i->1")
        expect(plan.deployments).toHaveLength(1)

        const deploymentPlan = plan.deployments[0]

        // deploy into cluster1
        expect(deploymentPlan.cluster).toBe("cluster1")

        // service1 gets from tag2 to tag3
        expect(deploymentPlan.image.tag).toBe("tag3")
        expect(deploymentPlan.deployment.name).toBe("service1")
        expect(deploymentPlan.deployment.image.tag).toBe("tag2")
    })
})
