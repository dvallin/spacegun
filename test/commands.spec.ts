import { commands } from "../src/commands"

const out = jest.fn()

import * as dispatcher from "../src/dispatcher"
const dispatched = jest.fn()
const dispatchFn = jest.fn()
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

    describe(commands.jobs.name, () => {

        it("calls the jobs backend and prints jobs", async () => {
            // given
            const job = { jobName: "someJob" }
            dispatchFn.mockReturnValue([job])

            // when
            await commands.jobs({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(1)
            expect(dispatched).toBeCalledWith("jobs", "jobs")

            expect(out).toHaveBeenCalledTimes(1)
            expect(out).toHaveBeenCalledWith(job)
        })
    })

    describe(commands.pods.name, () => {

        it("calls the pods backend for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([{ name: "service1" }])
                .mockReturnValueOnce([{ name: "service1" }])

            // when
            await commands.pods({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "pods")
        })
    })

    describe(commands.pods.name, () => {

        it("calls the pods backend for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([{ name: "service1" }])
                .mockReturnValueOnce([{ name: "service1" }])

            // when
            await commands.pods({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "pods")
        })
    })

    describe(commands.scalers.name, () => {

        it("calls the scalers backend for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([{ name: "scaler1", replicas: { current: 0, minimum: 1, maximum: 2 } }])
                .mockReturnValueOnce([{ name: "scaler1", replicas: { current: 1, minimum: 1, maximum: 1 } }])

            // when
            await commands.scalers({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "scalers")
        })
    })

    describe(commands.deployments.name, () => {

        it("calls the pods deployments for each cluster", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([{ name: "deployment1" }])
                .mockReturnValueOnce([{ name: "deployment2" }])

            // when
            await commands.deployments({ out })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "deployments")
        })
    })

    describe(commands.run.name, () => {

        it("runs a job if user agrees", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["job1", "job2"])
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
                .mockReturnValueOnce(["job1", "job2"])
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
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([{ name: "deployment1", image: { name: "image" } }])
                .mockReturnValueOnce([{ lastUpdated: 1, tag: "tag1" }, { lastUpdated: 2, tag: "tag2" }])
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => true)

            // when
            await commands.deploy({ out, choose, expect: expectFn })

            // then
            expect(dispatched).toHaveBeenCalledTimes(4)
            expect(dispatched).toBeCalledWith("cluster", "clusters")
            expect(dispatched).toBeCalledWith("cluster", "deployments")
            expect(dispatched).toBeCalledWith("images", "versions")
            expect(dispatched).toBeCalledWith("cluster", "updateDeployment")
        })

        it("does not deploy an image if user disagrees", async () => {
            // given
            dispatchFn
                .mockReturnValueOnce(["cluster1", "cluster2"])
                .mockReturnValueOnce([{ name: "deployment1", image: { name: "image" } }])
                .mockReturnValueOnce([{ lastUpdated: 1, tag: "tag1" }, { lastUpdated: 2, tag: "tag2" }])
                .mockReturnValueOnce({ name: "deployment1" })

            const choose = jest.fn().mockImplementation(({ }, b) => b[0])
            const expectFn = jest.fn().mockImplementation(() => false)

            // when
            await commands.deploy({ out, choose, expect: expectFn })

            // then
            expect(dispatched).toHaveBeenCalledTimes(3)
            expect(dispatched).not.toBeCalledWith("cluster", "updateDeployment")
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
})
