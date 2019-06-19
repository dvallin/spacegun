import { IO } from '../../IO'

import { call } from '../../dispatcher'

import * as imageModule from '../../images/ImageModule'

import { DeploymentPlan, DeployableResource } from '../model/DeploymentPlan'
import { Deployment } from '../../cluster/model/Deployment'
import { ServerGroup } from '../../cluster/model/ServerGroup'
import { Filter, matchesResource, matchesServerGroup } from '../model/Filter'
import { JobPlan } from '../model/JobPlan'
import { Batch } from 'src/cluster/model/Batch'

export type FetchedDeployment = {}

export class PlanImageDeployment {
    public constructor(
        readonly name: string,
        readonly tag: string | undefined,
        readonly semanticTagExtractor: string | undefined,
        readonly filter?: Partial<Filter>,
        readonly io: IO = new IO()
    ) {}

    public async plan(group: ServerGroup, name: string, targetDeployments: Deployment[], targetBatches: Batch[]): Promise<JobPlan> {
        if (!matchesServerGroup(this.filter, group)) {
            return { name, deployments: [], batches: [] }
        }

        const deployments: DeploymentPlan<Deployment>[] = await this.planUpdate(group, targetDeployments)
        const batches: DeploymentPlan<Batch>[] = await this.planUpdate(group, targetBatches)

        return { name, deployments, batches }
    }

    private async planUpdate<T extends DeployableResource>(group: ServerGroup, targets: T[]): Promise<DeploymentPlan<T>[]> {
        const deployments: DeploymentPlan<T>[] = []
        for (const target of targets) {
            if (!matchesResource(this.filter, target)) {
                continue
            }
            this.io.out(`planning image deployment ${target.name} in ${this.name}`)
            if (target.image === undefined) {
                this.io.error(
                    `${target.name} in cluster ${group.cluster} has no image, so spacegun cannot determine the right image source`
                )
                continue
            }

            let tag = this.tag
            if (tag === undefined) {
                const tags = await call(imageModule.tags)(target.image)
                tag = this.getNewestTag(tags)
            }

            if (tag !== undefined) {
                const image = await call(imageModule.image)({
                    tag,
                    name: target.image.name,
                })

                if (target.image.url !== image.url) {
                    deployments.push({
                        group,
                        image,
                        deployable: target,
                    })
                }
            } else {
                throw new Error(
                    `Could not find a tag for resource ${target.name} in cluster ${group.cluster}, namespace ${group.namespace}`
                )
            }
        }
        return deployments
    }

    private getNewestTag(tags: string[]): string | undefined {
        let sortableTags: { key: string; tag: string }[]
        if (this.semanticTagExtractor !== undefined) {
            const regex = new RegExp(this.semanticTagExtractor!)
            sortableTags = tags
                .map(tag => {
                    const match = tag.match(regex)
                    if (match !== null && match.length > 0) {
                        return { key: match[0], tag }
                    }
                    return null
                })
                .filter(t => t != null) as { key: string; tag: string }[]
        } else {
            sortableTags = tags.map(tag => ({ key: tag, tag }))
        }

        sortableTags.sort((a, b) => b.key.localeCompare(a.key))
        if (sortableTags.length === 0) {
            return undefined
        }
        if (sortableTags.length > 1 && sortableTags[0].key === sortableTags[1].key) {
            return undefined
        }
        return sortableTags.length > 0 ? sortableTags[0].tag : undefined
    }
}
