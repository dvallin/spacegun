import { call } from '../../dispatcher'
import { IO } from '../../IO'

import * as clusterModule from '../../cluster/ClusterModule'
import * as eventModule from '../../events/EventModule'

import { Deployment } from '../../cluster/model/Deployment'
import { JobPlan } from '../model/JobPlan'
import { Batch } from 'src/cluster/model/Batch'

export class ApplyDeployment {
    public constructor(readonly name: string, public readonly io: IO = new IO()) {}

    public async apply(plan: JobPlan): Promise<Deployment[]> {
        const deployments: Deployment[] = []
        for (const update of plan.deployments) {
            const deployment = await call(clusterModule.updateDeployment)({
                group: update.group,
                image: update.image,
                deployment: update.deployable,
            })
            this.io.out(`sucessfully updated ${deployment.name} with image ${JSON.stringify(deployment.image)}`)
            deployments.push(deployment)
        }
        const batches: Batch[] = []
        for (const update of plan.batches) {
            const batch = await call(clusterModule.updateBatch)({
                group: update.group,
                image: update.image,
                batch: update.deployable,
            })
            this.io.out(`sucessfully updated ${batch.name} with image ${JSON.stringify(batch.image)}`)
            batches.push(batch)
        }
        if (deployments.length > 0) {
            call(eventModule.log)({
                message: `Applied pipeline ${plan.name}`,
                timestamp: Date.now(),
                topics: ['slack'],
                description: `Applied ${plan.deployments.length} deployments while executing pipeline ${plan.name}`,
                fields: plan.deployments
                    .map(deployment => ({
                        title: `${deployment.group.cluster} ∞ ${deployment.group.namespace} ∞ ${deployment.deployable.name}`,
                        value: `updated to ${deployment.image.url}`,
                    }))
                    .concat(
                        plan.batches.map(batch => ({
                            title: `${batch.group.cluster} ∞ ${batch.group.namespace} ∞ ${batch.deployable.name}`,
                            value: `updated to ${batch.image.url}`,
                        }))
                    ),
            })
        }
        return deployments
    }
}
