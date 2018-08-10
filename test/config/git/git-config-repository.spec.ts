import { GitConfigRepository } from "../../../src/config/git/GitConfigRepository"
import { Layers } from "../../../src/dispatcher/model/Layers"

describe("GitConfigRepository", () => {

    beforeEach(() => {
        process.env.LAYER = Layers.Server
    })

    describe("fromConfig", () => {

        it("builds only if config.git exists and layer is server", () => {
            expect(GitConfigRepository.fromConfig({ git: {} })).toBeDefined()
            expect(GitConfigRepository.fromConfig({ git: undefined })).toBeUndefined()
            process.env.LAYER = Layers.Client
            expect(GitConfigRepository.fromConfig({ git: {} })).toBeUndefined()
        })
    })


    describe("methods", () => {

        let repo
        beforeEach(() => {
            repo = GitConfigRepository.fromConfig({ git: { remote: "remotePath" } })
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
