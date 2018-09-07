import { callParameters } from "../test-utils/jest"

import { get } from "../../src/dispatcher"

process.env.LAYER = "server"
import { moduleName, globalFunction, remoteFunction, functions } from "./TestModule"
import { RequestInput } from "../../src/dispatcher/model/RequestInput";

describe("server dispatcher", () => {

    beforeEach(() => {
        jest.resetAllMocks()
    })

    it("calls global functions locally", () => {
        // when
        get(moduleName, functions.standalone)()

        // then
        expect(globalFunction).toHaveBeenCalledTimes(1)
    })

    it("throws error on calls to local functions", () => {
        expect(() => get(moduleName, functions.local)()).toThrowErrorMatchingSnapshot()
    })

    it("throws error on calls to local functions with parameters", () => {
        expect(() => get(moduleName, functions.local)(RequestInput.of(["param", 1]))).toThrowErrorMatchingSnapshot()
    })

    it("calls remote void function locally", async () => {
        // when
        await get(moduleName, functions.remoteVoid)()

        // then
        expect(remoteFunction).toHaveBeenCalled()
    })

    it("calls remote params function locally", async () => {
        // given
        const params = RequestInput.of(["param", 1])

        // when
        await get(moduleName, functions.remoteParams)(params)

        // then
        expect(remoteFunction).toHaveBeenCalled()
    })

    it("extracts params from remote params call", async () => {
        // given
        const params = RequestInput.of(["param", 1], ["param", 2], ["another param", "1"])

        // when
        await get(moduleName, functions.remoteParams)(params)

        // then
        expect(callParameters(remoteFunction)[0]).toEqual(1)
    })
})
