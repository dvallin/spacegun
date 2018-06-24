import { pad } from "../src/pad"
import chalk from "chalk"

describe("pad", () => {

    it("pads empty string", () => {
        expect(pad("")).toHaveLength(7 * 12)
    })

    it("pads text by columns", () => {
        expect(pad("abc", 1)).toHaveLength(7)
        expect(pad("abc", 2)).toHaveLength(14)
    })
})
