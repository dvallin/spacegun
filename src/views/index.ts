import * as moment from "moment"
import { Resource } from "@/dispatcher/resource"
import { call } from "@/dispatcher"
import { clusters, namespaces, pods } from "@/cluster/ClusterModule"
import { jobs, schedules } from "@/jobs/JobsModule"
import { Config } from "@/config"
import { list, tags } from "@/images/ImageModule"

let config: Config | undefined
export function init(c: Config) {
    config = c
}

export class Module {

    @Resource({ path: "/" })
    public async index(): Promise<object> {
        const errors: string[] = []

        let clustersWithNamespaces = undefined
        try {
            const knownClusters: string[] = await call(clusters)()
            clustersWithNamespaces = []
            for (const cluster of knownClusters) {
                const knownNamespaces = await call(namespaces)({ cluster })
                clustersWithNamespaces.push({
                    name: cluster,
                    namespaces: knownNamespaces
                })
            }
        } catch (e) {
            errors.push("Clusters could not be loaded: " + e.message)
        }

        let jobsWithSchedules = undefined
        try {
            const knownJobs = await call(jobs)()
            jobsWithSchedules = []
            for (const job of knownJobs) {
                let knownSchedules = await call(schedules)(job)
                let lastRun: string | undefined
                let nextRun: string | undefined
                if (knownSchedules !== undefined) {
                    if (knownSchedules.lastRun !== undefined) {
                        lastRun = moment(knownSchedules.lastRun).toISOString()
                    }
                    if (knownSchedules.nextRuns.length > 0) {
                        nextRun = moment(knownSchedules.nextRuns[0]).toISOString()
                    }
                }
                jobsWithSchedules.push({
                    job,
                    lastRun,
                    nextRun,
                    config
                })
            }
        } catch (e) {
            errors.push("Jobs could not be loaded: " + e.message)
        }

        let knownImages = undefined
        try {
            knownImages = await call(list)()
        } catch (e) {
            errors.push("Images could not be loaded: " + e.message)
        }

        return {
            title: "Spacegun ∞ Dashboard",
            clusters: clustersWithNamespaces,
            jobs: jobsWithSchedules,
            images: knownImages,
            config,
            version: process.env.VERSION,
            errors
        }
    }

    @Resource({ path: "/pods/:cluster" })
    public async pods(params: { cluster: string }): Promise<object> {
        const cluster = params.cluster
        const knownNamespaces = await call(namespaces)({ cluster })
        const namespacesWithPods = []

        for (const namespace of knownNamespaces) {
            const knownPods = await call(pods)({ cluster, namespace })

            namespacesWithPods.push({
                name: namespace,
                pods: knownPods
            })
        }

        return {
            title: "Spacegun ∞ Pods ∞ " + cluster,
            name: params.cluster,
            namespaces: namespacesWithPods
        }
    }
    @Resource({ path: "/images/:image" })
    public async images(params: { image: string }): Promise<object> {
        const image = params.image
        const knownTags = await call(tags)({ name: image })
        const versionsWithDates = knownTags.map(tag => ({
            url: "tbd...",
            name: image,
            tag: tag,
        }))

        return {
            title: "Spacegun ∞ Images ∞ " + image,
            name: image,
            versions: versionsWithDates
        }
    }
}

