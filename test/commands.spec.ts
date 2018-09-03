import { commands } from "../src/commands"

const out = jest.fn()

import * as dispatcher from "../src/dispatcher"

const dispatched = jest.fn()
const dispatchFn = jest.fn()
dispatcher.call = (request: any) => {
    dispatched(request.module, request.procedure)
    return dispatchFn
}
dispatcher.get = (moduleName: string, procedureName: string) => {
    dispatched(moduleName, procedureName)
    return dispatchFn
}

describe("commands", () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    describe(commands.images.name, () => {

        it("calls the images backend and prints images", async () => {

            // given
            const image = { imageName: "someImage" }
            dispatchFn.mockReturnValue([image])

            // when
            await commands.images({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(1)
            expect(dispatched).toBeCalledWith("images", "images")

            expect(out).toHaveBeenCalledTimes(1)
            expect(out).toHaveBeenCalledWith(image)
        })
    })

    describe(commands.namespaces.name, () => {

        it("calls the namespaces backend and prints namespace", async () => {
            // given
            dispatchFn.mockReturnValue(["namespace1", "namespace2"])

            // when
            await commands.namespaces({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
        })
    })

    describe(commands.jobs.name, () => {

        it("calls the jobs backend and prints jobs", async () => {
            // given
            const job = { name: "someJob", from: {}, cluster: "cluster" }
            dispatchFn.mockReturnValue([job])

            // when
            await commands.jobs({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(1)
            expect(dispatched).toBeCalledWith("jobs", "jobs")
        })
    })

    describe(commands.pods.name, () => {

        it("calls the pods backend for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "service1" }])
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce([{ name: "service1" }])

            // when
            await commands.pods({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(5)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
            expect(dispatched).toBeCalledWith("cluster", "pods")
        })
    })

    describe(commands.scalers.name, () => {

        it("calls the scalers backend for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "scaler1", replicas: { current: 0, minimum: 1, maximum: 2 } }])
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce([{ name: "scaler1", replicas: { current: 1, minimum: 1, maximum: 1 } }])

            // when
            await commands.scalers({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(5)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
            expect(dispatched).toBeCalledWith("cluster", "scalers")
        })
    })

    describe(commands.deployments.name, () => {

        it("calls the pods deployments for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "deployment1" }])
                .mockReturnValueOnce(["service1"])
                .mockReturnValueOnce([{ name: "deployment2" }])

            // when
            await commands.deployments({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(5)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
            expect(dispatched).toBeCalledWith("cluster", "deployments")
        })
    })

    describe(commands.run.name, () => {

        it("runs a job if user agrees", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce([{ name: "job1" }, { name: "job2" }])
                .mockReturnValueOnce({
                    name: "plan", deployments: [
                        { name: "deployment1", deployment: {}, image: {} }
                    ]
                })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)

            // when
            await commands.run({ out, choose, expect: expectFn })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).toBeCalledWith("jobs", "jobs")
            expect(dispatched).toBeCalledWith("jobs", "plan")
            expect(dispatched).toBeCalledWith("jobs", "run")
        })

        it("does not run a job if user disagrees", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce([{ name: "job1" }, { name: "job2" }])
                .mockReturnValueOnce({
                    name: "plan", deployments: [
                        { name: "deployment1", deployment: {}, image: {} }
                    ]
                })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => false)

            // when
            await commands.run({ out, choose, expect: expectFn })

            // then
            expect(dispatched).toHaveBeenCalledTimes(2)
            expect(dispatched).not.toBeCalledWith("jobs", "run")
        })
    })

    describe(commands.deploy.name, () => {

        it("deploys an image if user agrees", async () => {
            // given
            const clusters = ["cluster1", "cluster2"]
            const namespaces = []
            const deployments = [{ name: "deployment1", image: { name: "image" } }]
            const images = [{ lastUpdated: 1, tag: "tag1" }, { lastUpdated: 2, tag: "tag2" }]
            dispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(images)
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)

            // when
            await commands.deploy({ out, choose, expect: expectFn })

            // then
            expect(choose).toHaveBeenCalledTimes(3)
            expect(choose).toHaveBeenCalledWith("> ", clusters)
            expect(choose).toHaveBeenCalledWith("> ", deployments)
            expect(choose).toHaveBeenCalledWith("> ", images)

            expect(dispatched).toHaveBeenCalledTimes(5)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
            expect(dispatched).toBeCalledWith("cluster", "deployments")
            expect(dispatched).toBeCalledWith("images", "versions")
            expect(dispatched).toBeCalledWith("cluster", "updateDeployment")
        })

        it("asks user for namespace if there are any", async () => {
            // given
            const clusters = ["cluster1", "cluster2"]
            const namespaces = ["service1"]
            const deployments = [{ name: "deployment1", image: { name: "image" } }]
            const images = [{ lastUpdated: 1, tag: "tag1" }, { lastUpdated: 2, tag: "tag2" }]
            dispatchFn
                .mockReturnValueOnce(clusters)
                .mockReturnValueOnce(namespaces)
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce(images)
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)

            // when
            await commands.deploy({ out, choose, expect: expectFn })

            // then
            expect(choose).toHaveBeenCalledTimes(4)
            expect(choose).toHaveBeenCalledWith("> ", clusters)
            expect(choose).toHaveBeenCalledWith("> ", deployments)
            expect(choose).toHaveBeenCalledWith("> ", images)
        })

        it("does not deploy an image if user disagrees", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{ name: "deployment1", image: { name: "image" } }])
                .mockReturnValueOnce([{ lastUpdated: 1, tag: "tag1" }, { lastUpdated: 2, tag: "tag2" }])
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => false)

            // when
            await commands.deploy({ out, choose, expect: expectFn })

            // then
            expect(dispatched).toHaveBeenCalledTimes(4)
            expect(dispatched).not.toBeCalledWith("cluster", "updateDeployment")
        })
    })

    describe(commands.jobSchedules.name, () => {

        it("prints schedules of a job", async () => {
            // given
            const job = { name: "1->2", cluster: "cluster2", from: { type: "cluster", expression: "cluster1" } }
            const schedules = { lastRun: undefined, nextRuns: [] }
            dispatchFn
                .mockReturnValueOnce([job])
                .mockReturnValueOnce(schedules)

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)

            // when
            await commands.jobSchedules({ out, choose, expect: expectFn })

            // then
            expect(dispatched).toHaveBeenCalledTimes(2)
            expect(dispatched).toBeCalledWith("jobs", "jobs")
            expect(dispatched).toBeCalledWith("jobs", "schedules")
        })
    })

    describe(commands.help.name, () => {

        it("fetches cluster and image endpoint names", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster"])
                .mockReturnValueOnce("someEndpoint")

            // when
            await commands.help({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(2)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("images", "endpoint")
        })
    })

    describe(commands.snapshot.name, () => {

        it("creates snapshots", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce({
                    deployments: [
                        { data: {}, name: "deployment1" },
                        { data: {}, name: "deployment2" }
                    ]
                })

            // when
            await commands.snapshot({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(5)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
            expect(dispatched).toBeCalledWith("cluster", "takeSnapshot")
            expect(dispatched).toBeCalledWith("config", "saveArtifact")
            expect(dispatched).toBeCalledWith("config", "saveArtifact")
        })
    })

    describe(commands.apply.name, () => {

        it("applies snapshots", async () => {
            // given
            const deployments = [
                { name: "deployment1", image: { name: "image" } },
                { name: "deployment2", image: { name: "image" } }
            ]
            dispatchFn
                .mockReturnValueOnce(["cluster"])
                .mockReturnValueOnce([])
                .mockReturnValueOnce(deployments)
                .mockReturnValueOnce({})
                .mockReturnValueOnce({})

            // when
            await commands.apply({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(6)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "namespaces")
            expect(dispatched).toBeCalledWith("cluster", "deployments")
            expect(dispatched).toBeCalledWith("config", "loadArtifact")
            expect(dispatched).toBeCalledWith("config", "loadArtifact")
            expect(dispatched).toBeCalledWith("cluster", "applySnapshot")
        })
    })
})
