import { router, register } from "../../src/dispatcher/api"
import { Layers } from "../../src/dispatcher/model/Layers"
import { Methods } from "../../src/dispatcher/model/Methods"
import { callParameters } from "../test-utils/jest"
import { Context, Next } from "../../src/dispatcher/server"

describe("register", () => {
    const mapper = jest.fn()
    const get = jest.spyOn(router, "get")
    const put = jest.spyOn(router, "put")
    const post = jest.spyOn(router, "post")

    describe("get requests", () => {

        beforeEach(() => {
            jest.resetAllMocks()

            const configuration = {
                moduleName: "moduleName",
                layer: Layers.Server,
                mapper,
                method: Methods.Get
            }
            register("procedureName", () => Promise.resolve("resultFromServer"), configuration)
        })

        it("register get requests", () => {
            expect(get).toHaveBeenCalledTimes(1)
            expect(callParameters(get, 0)[0]).toEqual("/moduleName/procedureName")
        })
    })

    describe("put requests", () => {

        beforeEach(() => {
            jest.resetAllMocks()

            const configuration = {
                moduleName: "moduleName",
                layer: Layers.Server,
                mapper,
                method: Methods.Put
            }
            register("procedureName", () => Promise.resolve("resultFromServer"), configuration)
        })

        it("register put requests", () => {
            expect(put).toHaveBeenCalledTimes(1)
            expect(callParameters(put, 0)[0]).toEqual("/moduleName/procedureName")
        })
    })

    describe("post requests", () => {

        beforeEach(() => {
            jest.resetAllMocks()

            const configuration = {
                moduleName: "moduleName",
                layer: Layers.Server,
                mapper,
                method: Methods.Post
            }
            register("procedureName", () => Promise.resolve("resultFromServer"), configuration)
        })

        it("register post requests", () => {
            expect(post).toHaveBeenCalledTimes(1)
            expect(callParameters(post, 0)[0]).toEqual("/moduleName/procedureName")
        })
    })

    describe("handle", () => {

        beforeEach(() => {
            jest.resetAllMocks()

            const configuration = {
                moduleName: "moduleName",
                layer: Layers.Server,
                mapper
            }
            register("procedureName", () => Promise.resolve("resultFromServer"), configuration)
        })

        it("handles a requests", async () => {
            const handle: (context: Context, next: Next) => Promise<{}> = callParameters(get, 0)[1]
            const context: Context = createContext(undefined, {})

            await handle(context, () => (Promise.resolve()))

            expect(context.status).toBe(200)
            expect(context.type).toEqual("application/json")
            expect(context.body).toEqual("\"resultFromServer\"")
            expect(mapper).toHaveBeenCalledWith({ data: undefined, params: {} })
        })

        it("decodes params", async () => {
            const handle: (context: Context, next: Next) => Promise<{}> = callParameters(get, 0)[1]
            const context: Context = createContext(undefined, { some: "param" })

            await handle(context, () => (Promise.resolve()))

            expect(mapper).toHaveBeenCalledWith({ data: undefined, params: { some: "param" } })
        })

        it("decodes request body", async () => {
            const handle: (context: Context, next: Next) => Promise<{}> = callParameters(get, 0)[1]
            const context: Context = createContext("some data", {})

            await handle(context, () => (Promise.resolve()))

            expect(mapper).toHaveBeenCalledWith({ data: "some data", params: {} })
        })
    })
})

function createContext(body: string | undefined, query: object): Context {
    return { request: { body }, query, params: {}, state: undefined, render: jest.fn() }
} 
