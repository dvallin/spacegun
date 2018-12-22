import { IO } from "../../IO"

import { call } from "../../dispatcher"

import * as imageModule from "../../images/ImageModule"

import { DeploymentPlan } from "../model/DeploymentPlan"
import { Deployment } from "../../cluster/model/Deployment"
import { ServerGroup } from "../../cluster/model/ServerGroup"
import { Filter, matchesDeployment, matchesServerGroup } from "../model/Filter"
import { JobPlan } from "../model/JobPlan";

export type FetchedDeployment = {}

export class PlanImageDeployment {

    public constructor(
        readonly name: string,
        readonly tag: string | undefined,
        readonly semanticTagExtractor: RegExp | string | undefined,
        readonly filter?: Partial<Filter>,
        readonly io: IO = new IO()
    ) { }

    public async plan(group: ServerGroup, name: string, targetDeployments: Deployment[]): Promise<JobPlan> {
        if (!matchesServerGroup(this.filter, group)) {
            return { name, deployments: [] }
        }

        const deployments: DeploymentPlan[] = []
        for (const targetDeployment of targetDeployments) {
            if (!matchesDeployment(this.filter, targetDeployment)) {
                continue
            }
            this.io.out(`planning image deployment ${targetDeployment.name} in ${this.name}`)
            if (targetDeployment.image === undefined) {
                this.io.error(`${targetDeployment.name} in cluster ${group.cluster} has no image, so spacegun cannot determine the right image source`)
                continue
            }

            let tag = this.tag
            if (tag === undefined) {
                const tags = await call(imageModule.tags)(targetDeployment.image)
                tag = this.getNewestTag(tags)
            }

            if (tag !== undefined) {
                const image = await call(imageModule.image)({
                    tag, name: targetDeployment.image.name
                })

                if (targetDeployment.image.url !== image.url) {
                    deployments.push({
                        group,
                        image,
                        deployment: targetDeployment,
                    })
                }
            } else {
                throw new Error(`Could not find a tag for deployment ${targetDeployment.name} in cluster ${group.cluster}, namespace ${group.namespace}`)
            }
        }
        return { name, deployments }
    }

    private getNewestTag(tags: string[]): string | undefined {
        let sortableTags: string[]
        if (this.semanticTagExtractor !== undefined) {
            sortableTags = tags.map(tag => tag.match(this.semanticTagExtractor!))
                .filter(match => match !== null && match.length > 0)
                .map(match => match![0])
        } else {
            sortableTags = tags
        }

        sortableTags.sort((a, b) => b.localeCompare(a))
        if (sortableTags.length === 0) {
            return undefined
        }
        if (sortableTags.length > 1 && sortableTags[0] === sortableTags[1]) {
            return undefined
        }
        return sortableTags.length > 0 ? sortableTags[0] : undefined
    }
}
