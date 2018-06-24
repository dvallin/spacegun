import { parse } from "../src/options"

describe("options", () => {

    it("defaults correctly", () => {
        process.argv = []
        expect(parse().command).toEqual("help")
    })

    describe("commands", () => {

        it("parses pods", () => {
            process.argv = ["", "", "pods"]
            expect(parse().command).toEqual("pods")
        })

        it("parses deployments", () => {
            process.argv = ["", "", "deployments"]
            expect(parse().command).toEqual("deployments")
        })

        it("parses scalers", () => {
            process.argv = ["", "", "scalers"]
            expect(parse().command).toEqual("scalers")
        })
    })
})
