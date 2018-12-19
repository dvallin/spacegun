import { extractImageName } from "../../../src/cluster/kubernetes/extract-image-name"

describe(extractImageName.name, () => {

    it("extracts from plain image name", () => {
        expect(extractImageName("nginx")).toEqual("nginx")
    })

    it("extracts from default host and no hash", () => {
        expect(extractImageName("nginx:latest")).toEqual("nginx")
    })

    it("extracts from default host", () => {
        expect(extractImageName("nginx:latest@sha256:12345")).toEqual("nginx")
    })

    it("extracts from fancy host", () => {
        expect(extractImageName("some-fancy-url.com/nginx:latest@sha256:12345")).toEqual("nginx")
    })

    it("extracts from localhost", () => {
        expect(extractImageName("localhost:5000/nginx:latest@sha256:12345")).toEqual("nginx")
    })
})
