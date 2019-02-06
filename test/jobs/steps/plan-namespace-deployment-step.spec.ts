import { Request } from '../../../src/dispatcher/model/Request'

import { Deployment } from '../../../src/cluster/model/Deployment'
import { ServerGroup } from '../../../src/cluster/model/ServerGroup'

import { PlanNamespaceDeployment } from '../../../src/jobs/steps/PlanNamespaceDeployment'

let mockDeployments: { [key: string]: Deployment[] } = {}

jest.mock('../../../src/dispatcher/index', () => ({
    get: jest.fn(),
    call: (request: Request<any, any>) => {
        switch (request.module) {
            case 'cluster': {
                switch (request.procedure) {
                    case 'deployments': {
                        return (input: { cluster: string }) => Promise.resolve(mockDeployments[input.cluster])
                    }
                }
                break
            }
        }
        return undefined
    },
    add: () => {},
    path: () => '',
}))

describe(PlanNamespaceDeployment.name, () => {
    const targetGroup: ServerGroup = { cluster: 'targetCluster', namespace: 'targetNamespace' }
    const step = new PlanNamespaceDeployment('stepName', 'sourceCluster', 'sourceNamespace', 'targetNamespace', {
        deployments: ['deployment1'],
    })
    const targetDeployments: Deployment[] = [{ name: 'deployment1' }]

    it('plans deployments', async () => {
        // given
        mockDeployments = { sourceCluster: [{ name: 'deployment1', image: { name: 'image1', url: 'url1' } }] }

        // when
        const plan = await step.plan(targetGroup, 'pipeline1', targetDeployments)

        // then
        expect(plan.deployments).toEqual([
            {
                deployment: { name: 'deployment1' },
                group: { cluster: 'targetCluster', namespace: 'targetNamespace' },
                image: { name: 'image1', url: 'url1' },
            },
        ])
    })

    it('does not plan if target namespace does not match', async () => {
        // when
        const plan = await step.plan(
            {
                cluster: 'targetCluster', // Cluster is always set to the target cluster from the pipeline, so it can't be different.
                namespace: 'otherNamespace',
            },
            'pipeline1',
            targetDeployments
        )

        // then
        expect(plan.deployments).toEqual([])
    })

    it('ignores deployments that do not match', async () => {
        // given
        mockDeployments = { sourceCluster: [{ name: 'deployment2', image: { name: 'image1', url: 'url1' } }] }

        // when
        const plan = await step.plan(targetGroup, 'pipeline1', [
            {
                name: 'deployment2',
                image: { name: 'image1', url: 'url2' },
            },
        ])

        // then
        expect(plan.deployments).toEqual([])
    })

    it('ignores deployments that cannot be found in source', async () => {
        // given
        step.io.error = jest.fn()
        mockDeployments = { sourceCluster: [{ name: 'otherDeployment', image: { name: 'image1', url: 'url1' } }] }

        // when
        const plan = await step.plan(targetGroup, 'pipeline1', targetDeployments)

        // then
        expect(plan.deployments).toEqual([])
        expect(step.io.error).toHaveBeenCalledWith(
            'deployment1 in {cluster: targetCluster, namespace: targetNamespace} has no appropriate deployment ' +
                'in {cluster: sourceCluster, namespace: sourceNamespace}'
        )
    })

    it('ignores deployments that have no image in source', async () => {
        // given
        step.io.error = jest.fn()
        mockDeployments = { sourceCluster: [{ name: 'deployment1' }] }

        // when
        const plan = await step.plan(targetGroup, 'pipeline1', targetDeployments)

        // then
        expect(plan.deployments).toEqual([])
        expect(step.io.error).toHaveBeenCalledWith('deployment1 in {cluster: sourceCluster, namespace: sourceNamespace} has no image')
    })

    it('ignores deployments that have same image as source', async () => {
        // given
        const deployments = [{ name: 'deployment1', image: { name: 'image1', url: 'url1' } }]
        mockDeployments = { sourceCluster: deployments }

        // when
        const plan = await step.plan(targetGroup, 'pipeline1', deployments)

        // then
        expect(plan.deployments).toEqual([])
    })

    it('filters deployments correctly', async () => {
        // given
        mockDeployments = {
            sourceCluster: [
                { name: 'deployment1', image: { name: 'image1', url: 'url1' } },
                { name: 'deployment3' },
                { name: 'deployment4', image: { name: 'image4', url: 'url4' } },
                { name: 'deployment5', image: { name: 'image5', url: 'url5' } },
            ],
        }
        const step = new PlanNamespaceDeployment('stepName', 'sourceCluster', 'sourceNamespace', 'targetNamespace', {
            deployments: ['deployment2', 'deployment3', 'deployment4', 'deployment5'],
        })
        step.io.error = jest.fn()
        const targetDeployments: Deployment[] = [
            { name: 'deployment1' },
            { name: 'deployment2' },
            { name: 'deployment3' },
            { name: 'deployment5' },
        ]

        // when
        const plan = await step.plan(targetGroup, 'pipeline1', targetDeployments)

        // then
        expect(plan.deployments).toEqual([
            {
                deployment: { name: 'deployment5' },
                group: { cluster: 'targetCluster', namespace: 'targetNamespace' },
                image: { name: 'image5', url: 'url5' },
            },
        ])
        expect(step.io.error).toHaveBeenCalledTimes(2)
        expect(step.io.error).toHaveBeenCalledWith('deployment3 in {cluster: sourceCluster, namespace: sourceNamespace} has no image')
        expect(step.io.error).toHaveBeenCalledWith(
            'deployment2 in {cluster: targetCluster, namespace: targetNamespace} has no appropriate deployment ' +
                'in {cluster: sourceCluster, namespace: sourceNamespace}'
        )
    })
})
