jest.mock("../../src/dispatcher/server", () => ({
    createServer: (): Server => ({ use: jest.fn(), listen: jest.fn() }),
    createRouter: () => ({}),
    createViews: () => ({})
}))

import { Server } from "../../src/dispatcher/server"
import { server } from "../../src/dispatcher/api"


const errorSpy = jest.spyOn(global.console, "error")
const warnSpy = jest.spyOn(global.console, "warn")

describe("error handling middleware", () => {

    beforeEach(() => {
        errorSpy.mockClear()
        warnSpy.mockClear()
    })

    it("registers", () => {
        expect(server.use).toHaveBeenCalledTimes(1)
    })

    it("eats exceptions and logs them to console error", async () => {
        const errorHandlingMiddleware = (server.use as jest.Mock<{}>).mock.calls[0][0]

        const error = new Error("some error")
        await errorHandlingMiddleware({}, () => { throw error })

        expect(errorSpy).toHaveBeenCalledWith(error)
    })

    it("logs context to console warn on 404", async () => {
        const errorHandlingMiddleware = (server.use as jest.Mock<{}>).mock.calls[0][0]

        const context = { status: 404 }
        await errorHandlingMiddleware({ status: 404 }, () => Promise.resolve())

        expect(warnSpy).toHaveBeenCalledWith(context)
    })
})
