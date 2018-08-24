import { printHelp } from "../src/commands"
jest.mock("../src/commands")

import { IO } from "../src/IO"

import { Layers } from "../src/dispatcher/model/Layers"
import { Application } from "../src/Application"
import { callParameters } from "./test-utils/jest"

describe("Application", () => {

    let app
    beforeEach(() => {
        jest.resetAllMocks()
        process.chdir(__dirname)
        const io = new IO()
        const crons = { register: jest.fn(), startAllCrons: jest.fn(), removeAllCrons: jest.fn() }
        const options = {}
        app = new Application(io, crons, options)
    })

    it("calls the help function with error", () => {
        app.run()
        expect(printHelp).toHaveBeenCalledTimes(1)
    })

    it("registers the cronjobs", async () => {
        app.options.config = "./test-config/config.yml"
        process.env.LAYER = Layers.Server
        await app.run()
        expect(app.crons.register).toHaveBeenCalledTimes(3)
        expect(callParameters(app.crons.register, 0)[0]).toEqual("config-reload")
        expect(callParameters(app.crons.register, 1)[0]).toEqual("dev")
        expect(callParameters(app.crons.register, 2)[0]).toEqual("pre")
        expect(app.crons.removeAllCrons).toHaveBeenCalledTimes(1)
    })

    it("registers the cronjobs", async () => {
        app.options.config = "./test-config/config.yml"
        process.env.LAYER = Layers.Standalone
        await app.run()
        expect(app.crons.register).toHaveBeenCalledTimes(0)
        expect(app.crons.removeAllCrons).toHaveBeenCalledTimes(1)
    })

    it("reloads the cronjobs", async () => {
        app.options.config = "./test-config/config.yml"
        process.env.LAYER = Layers.Server
        const hasNewConfig = () => (Promise.resolve(true))
        const fetchNewConfig = () => (Promise.resolve())
        await app.checkForConfigChange({ hasNewConfig, fetchNewConfig })
        expect(app.crons.register).toHaveBeenCalledTimes(3)
        expect(callParameters(app.crons.register, 0)[0]).toEqual("config-reload")
        expect(callParameters(app.crons.register, 1)[0]).toEqual("dev")
        expect(callParameters(app.crons.register, 2)[0]).toEqual("pre")
        expect(app.crons.removeAllCrons).toHaveBeenCalledTimes(1)
    })
})
