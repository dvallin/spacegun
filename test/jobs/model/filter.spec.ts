import { matchesDeployment, matchesServerGroup } from "../../../src/jobs/model/Filter"

describe(matchesDeployment.name, () => {

    const name = "deployment"

    it("matches on missing filter", () => {
        expect(matchesDeployment(undefined, { name })).toBeTruthy()
        expect(matchesDeployment({}, { name })).toBeTruthy()
    })

    it("does not match if not contained in list", () => {
        expect(matchesDeployment({ deployments: [] }, { name })).toBeFalsy()
        expect(matchesDeployment({ deployments: ["other"] }, { name })).toBeFalsy()
    })

    it("matches if  contained in list", () => {
        expect(matchesDeployment({ deployments: [name] }, { name })).toBeTruthy()
        expect(matchesDeployment({ deployments: ["other", name] }, { name })).toBeTruthy()
    })
})
describe(matchesServerGroup.name, () => {

    const namespace = "namespace"

    it("matches on missing filter", () => {
        expect(matchesServerGroup(undefined, { cluster: "c1", namespace })).toBeTruthy()
        expect(matchesServerGroup({}, { cluster: "c1", namespace })).toBeTruthy()
    })

    it("matches on missing namespace", () => {
        expect(matchesServerGroup(undefined, { cluster: "c1" })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: [] }, { cluster: "c1" })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: ["other"] }, { cluster: "c1" })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: [namespace] }, { cluster: "c1" })).toBeTruthy()
    })

    it("does not match if not contained in list", () => {
        expect(matchesServerGroup({ namespaces: [] }, { cluster: "c1", namespace })).toBeFalsy()
        expect(matchesServerGroup({ namespaces: ["other"] }, { cluster: "c1", namespace })).toBeFalsy()
    })

    it("matches if contained in list", () => {
        expect(matchesServerGroup({ namespaces: [namespace] }, { cluster: "c1", namespace })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: ["other", namespace] }, { cluster: "c1", namespace })).toBeTruthy()
    })
})
