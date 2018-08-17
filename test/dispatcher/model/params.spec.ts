import { queryToParams } from "../../../src/dispatcher/model/Params"

describe("queryToParams", () => {

    it("encodes empty", () => {
        expect(queryToParams(undefined)).toEqual({})
        expect(queryToParams({})).toEqual({})
    })

    it("encodes a single value", () => {
        expect(queryToParams({ single: "value" })).toEqual({ single: ["value"] })
    })

    it("encodes a multiple values", () => {
        expect(queryToParams({ single: "value", multiple: "values" })).toEqual({ single: ["value"], multiple: ["values"] })
    })

    it("encodes arrays", () => {
        expect(queryToParams({ array: ["value1", "value2"] })).toEqual({ array: ["value1", "value2"] })
    })
})
