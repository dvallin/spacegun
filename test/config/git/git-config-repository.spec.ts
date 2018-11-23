import { fromConfig, GitConfigRepository } from "../../../src/config/git/GitConfigRepository"
import { Layers } from "../../../src/dispatcher/model/Layers"

import { GitConfig, Config } from "../../../src/config/index"

describe("GitConfigRepository", () => {

    beforeEach(() => {
        process.env.LAYER = Layers.Server
    })

    describe("fromConfig", () => {

        it("builds only if config.git exists and layer is server", () => {
            expect(fromConfig(createConfig({ remote: "someGit", cron: "someCron" }))).toBeDefined()
            expect(fromConfig(createConfig())).toBeUndefined()
            process.env.LAYER = Layers.Client
            expect(fromConfig(createConfig({ remote: "someGit", cron: "someCron" }))).toBeUndefined()
        })
    })


    describe("methods", () => {

        let repo: GitConfigRepository
        beforeEach(() => {
            repo = fromConfig(createConfig({ remote: "remotePath", cron: "someCron" }))!
        })

        describe("hasNewConfig", () => {

            it("clones if this is not already a repo", async () => {
                repo.git.checkIsRepo = jest.fn().mockReturnValue(Promise.resolve(false))
                repo.git.clone = jest.fn().mockReturnValue(Promise.resolve())
                const newConfig = await repo.hasNewConfig()

                expect(newConfig).toBeTruthy()
                expect(repo.git.checkIsRepo).toHaveBeenCalledTimes(1)
                expect(repo.git.clone).toHaveBeenCalledTimes(1)
                expect(repo.git.clone).toBeCalledWith("remotePath", "./")
            })

            it("calls fetch and status repo", async () => {
                repo.git.checkIsRepo = jest.fn().mockReturnValue(Promise.resolve(true))
                repo.git.fetch = jest.fn().mockReturnValue(Promise.resolve())
                repo.git.status = jest.fn().mockReturnValue(Promise.resolve({ behind: 1 }))

                const newConfig = await repo.hasNewConfig()

                expect(newConfig).toBeTruthy()
                expect(repo.git.status).toHaveBeenCalledTimes(1)
                expect(repo.git.fetch).toHaveBeenCalledTimes(1)
            })

            it("returns false if status is not behind", async () => {
                repo.git.checkIsRepo = jest.fn().mockReturnValue(Promise.resolve(true))
                repo.git.status = jest.fn().mockReturnValue(Promise.resolve({ behind: 0 }))

                const newConfig = await repo.hasNewConfig()

                expect(newConfig).toBeFalsy()
                expect(repo.git.checkIsRepo).toHaveBeenCalledTimes(1)
                expect(repo.git.status).toHaveBeenCalledTimes(1)
            })
        })

        describe("fetchNewConfig", () => {

            it("calls git pull", async () => {
                repo.git.pull = jest.fn().mockReturnValue(Promise.resolve())

                await repo.fetchNewConfig()

                expect(repo.git.pull).toHaveBeenCalledTimes(1)
            })
        })
    })
})

function createConfig(git?: GitConfig): Config {
    return {
        git,
        kube: "",
        docker: "",
        pipelines: "",
        artifacts: "",
        server: { host: "", port: 2 },
        configBasePath: "./"
    }
}
