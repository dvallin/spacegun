import { createServer, createRouter, createViews, Router, View } from "../../src/dispatcher/server"
import * as koa from "koa"
import * as router from "koa-router"

process.env.LAYER = "server"

describe(createServer.name, () => {

    it("creates a koa server with middleware", () => {
        const server = (createServer() as unknown) as koa
        expect(server.middleware.length).toEqual(2)
    })
})

describe(createRouter.name, () => {

    it("creates a koa router", () => {
        const router = (createRouter() as unknown) as router
        expect(router.routes().name).toEqual("dispatch")
        expect(router.allowedMethods().name).toEqual("allowedMethods")
    })
})

describe(createViews.name, () => {

    it("creates a koa view with a template engine", () => {
        const views = createViews()
        expect(views.templateEngine("").name).toEqual("views")
    })

    it("registers views", () => {
        const get = jest.fn()
        const router: Router = { get, post: jest.fn(), put: jest.fn(), routes: jest.fn(), allowedMethods: jest.fn() }
        const view: View = { filename: "someFile", path: "somePath", params: () => ({ some: "Object" }) }

        const views = createViews()
        views.register(router, view)

        expect(get.mock.calls[0][0]).toEqual("somePath")
    })

    it("creates a router callback", async () => {
        const get = jest.fn()
        const router: Router = { get, post: jest.fn(), put: jest.fn(), routes: jest.fn(), allowedMethods: jest.fn() }
        const view: View = { filename: "someFile", path: "somePath", params: () => ({ some: "Object" }) }

        const views = createViews()
        views.register(router, view)
        const context = { state: {}, render: jest.fn() }
        await get.mock.calls[0][1](context)

        expect(context.state).toEqual({ engine: "pug" })
        expect(context.render).toHaveBeenCalledWith("someFile", { some: "Object" })
    })
})
