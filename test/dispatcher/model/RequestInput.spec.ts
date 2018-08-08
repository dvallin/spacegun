import { RequestInput } from "../../../src/dispatcher/model/RequestInput";

describe("RequestInput", () => {

    it("can be constructed with params", () => {
        const input = RequestInput.of(["param", 1], ["param", 2], ["another", "param"])
        expect(input.params).toEqual({
            param: ["1", "2"],
            another: "param"
        })
    })

    it("can be constructed with data", () => {
        const input = RequestInput.ofData("Some data", ["param", 1], ["param", 2], ["another", "param"])
        expect(input.data).toEqual("Some data")
        expect(input.params).toEqual({
            param: ["1", "2"],
            another: "param"
        })
    })
})
