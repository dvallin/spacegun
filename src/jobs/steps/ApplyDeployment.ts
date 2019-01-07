import { call } from '../../dispatcher'
import { IO } from '../../IO'

import * as clusterModule from '../../cluster/ClusterModule'
import * as eventModule from '../../events/EventModule'

import { Deployment } from '../../cluster/model/Deployment'
import { JobPlan } from '../model/JobPlan'

export class ApplyDeployment {
    public constructor(readonly name: string, public readonly io: IO = new IO()) {}

    public async apply(plan: JobPlan): Promise<Deployment[]> {
        const deployments: Deployment[] = []
        for (const update of plan.deployments) {
            const deployment = await call(clusterModule.updateDeployment)(update)
            this.io.out(`sucessfully updated ${deployment.name} with image ${JSON.stringify(deployment.image)}`)
            deployments.push(deployment)
        }
        if (deployments.length > 0) {
            call(eventModule.log)({
                message: `Applied pipeline ${plan.name}`,
                timestamp: Date.now(),
                topics: ['slack'],
                description: `Applied ${plan.deployments.length} deployments while executing pipeline ${plan.name}`,
                fields: plan.deployments.map(deployment => ({
                    title: `${deployment.group.cluster} ∞ ${deployment.group.namespace} ∞ ${deployment.deployment.name}`,
                    value: `updated to ${deployment.image.url}`,
                })),
            })
        }
        return deployments
    }
}
