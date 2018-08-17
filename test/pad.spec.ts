import { pad } from "../src/pad"

describe("pad", () => {

    const padColumns = 8

    it("pads empty string", () => {
        expect(pad("")).toHaveLength(padColumns * 12)
    })

    it("pads text by columns", () => {
        expect(pad("abc", 1)).toHaveLength(padColumns)
        expect(pad("abc", 2)).toHaveLength(2 * padColumns)
    })
})
