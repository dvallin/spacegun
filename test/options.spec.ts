import { parse } from "../src/options"

describe("options", () => {

    it("defaults correctly", () => {
        process.argv = []
        expect(parse().kube.endsWith("/.kube/config")).toBeTruthy()
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

    describe("kubernetes config file option", () => {

        it("accepts --kube", () => {
            process.argv = ["", "", "--kube=path/to/file"]
            expect(parse().kube).toEqual("path/to/file")
        })

        it("accepts -k", () => {
            process.argv = ["", "", "-k", "path/to/file"]
            expect(parse().kube).toEqual("path/to/file")
        })
    })
})
