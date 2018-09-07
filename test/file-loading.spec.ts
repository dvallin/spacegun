import { load, save } from "../src/file-loading"

const mockReadFile = jest.fn()
const mockWriteFile = jest.fn()
const mockMkdir = jest.fn()
let mockMkdirError: Error | undefined = undefined

jest.mock("fs", () => ({
    readFileSync: (path: string) => mockReadFile(path),
    writeFileSync: (path: string, data: string) => mockWriteFile(path, data)
}))

jest.mock("mkdirp", () => ((path: string, callback: (e?: Error) => void) => {
    mockMkdir(path)
    callback(mockMkdirError)
}))

const ymlSerialObject = "some: param\nsomeOther: 2\n"
const testObject = { some: "param", someOther: 2 }

describe(load.name, () => {

    it("loads yaml files", () => {
        mockReadFile.mockReturnValue(ymlSerialObject)

        const file = load("test/test-config/config.yml")

        expect(file).toEqual(testObject)
        expect(mockReadFile).toHaveBeenCalledWith("test/test-config/config.yml")
    })
})

describe(save.name, () => {

    it("saves yaml files", async () => {
        await save("some/path/file.yml", testObject)

        expect(mockMkdir).toHaveBeenCalledWith("some/path")
        expect(mockWriteFile).toHaveBeenCalledWith("some/path/file.yml", ymlSerialObject)
    })

    it("propagates file io errors", () => {
        mockMkdirError = new Error("some issue happened")

        return expect(save("some/path/file.yml", testObject)).rejects.toMatchSnapshot()
    })
})
