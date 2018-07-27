import { Layers } from "../../src/dispatcher/model/Layers"
process.env.LAYER = Layers.Standalone

import * as clusterModule from "@/cluster/ClusterModule"
import * as imageModule from "@/images/ImageModule"

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

import { JobsRepository } from "../../src/jobs/JobsRepository"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"

describe("JobsRepository", () => {

    let repo: JobsRepository

    beforeEach(() => {
        const jobs = new Map()
        jobs.set("1->2", { cluster: "cluster2", from: { type: "cluster", expression: "cluster1" }, cron: "* * * * *" })
        jobs.set("i->1", { cluster: "cluster1", from: { type: "image", expression: "^(?!.*latest).*$" }, cron: "* * * * *" })

        jest.mock("../../src/dispatcher/index", () => ({
            get: jest.fn()
        }))

        repo = new JobsRepository(jobs)
    })

    it("registers the job names", () => {
        expect(repo.list).toEqual(["1->2", "i->1"])
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
