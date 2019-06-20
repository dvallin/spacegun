import { matchesResource, matchesServerGroup } from '../../../src/jobs/model/Filter'

describe(matchesResource.name, () => {
    const name = 'deployment'

    it('matches on missing filter', () => {
        expect(matchesResource(undefined, { name })).toBeTruthy()
        expect(matchesResource({}, { name })).toBeTruthy()
    })

    it('does not match if not contained in list', () => {
        expect(matchesResource({ resources: [] }, { name })).toBeFalsy()
        expect(matchesResource({ resources: ['other'] }, { name })).toBeFalsy()
    })

    it('matches if  contained in list', () => {
        expect(matchesResource({ resources: [name] }, { name })).toBeTruthy()
        expect(matchesResource({ resources: ['other', name] }, { name })).toBeTruthy()
    })
})
describe(matchesServerGroup.name, () => {
    const namespace = 'namespace'

    it('matches on missing filter', () => {
        expect(matchesServerGroup(undefined, { cluster: 'c1', namespace })).toBeTruthy()
        expect(matchesServerGroup({}, { cluster: 'c1', namespace })).toBeTruthy()
    })

    it('matches on missing namespace', () => {
        expect(matchesServerGroup(undefined, { cluster: 'c1' })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: [] }, { cluster: 'c1' })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: ['other'] }, { cluster: 'c1' })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: [namespace] }, { cluster: 'c1' })).toBeTruthy()
    })

    it('does not match if not contained in list', () => {
        expect(matchesServerGroup({ namespaces: [] }, { cluster: 'c1', namespace })).toBeFalsy()
        expect(matchesServerGroup({ namespaces: ['other'] }, { cluster: 'c1', namespace })).toBeFalsy()
    })

    it('matches if contained in list', () => {
        expect(matchesServerGroup({ namespaces: [namespace] }, { cluster: 'c1', namespace })).toBeTruthy()
        expect(matchesServerGroup({ namespaces: ['other', namespace] }, { cluster: 'c1', namespace })).toBeTruthy()
    })
})
