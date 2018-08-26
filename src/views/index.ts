import * as moment from "moment"
import { Resource } from "@/dispatcher/resource"
import { call } from "@/dispatcher"
import { clusters, namespaces, pods } from "@/cluster/ClusterModule"
import { jobs, schedules } from "@/jobs/JobsModule"
import { Config } from "@/config"
import { images, versions } from "@/images/ImageModule";

let config: Config | undefined
export function init(c: Config) {
    config = c
}

export class Module {

    @Resource({ path: "/" })
    public async index(): Promise<object> {
        const knownClusters: string[] = await call(clusters)()
        const clustersWithNamespaces = []
        for (const cluster of knownClusters) {
            const knownNamespaces = await call(namespaces)({ cluster })
            clustersWithNamespaces.push({
                name: cluster,
                namespaces: knownNamespaces
            })
        }

        const knownJobs = await call(jobs)()
        const jobsWithSchedules = []
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

        const knownImages = await call(images)()

        return {
            title: "Spacegun ∞ Dashboard",
            clusters: clustersWithNamespaces,
            jobs: jobsWithSchedules,
            images: knownImages,
            config,
            version: process.env.VERSION
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
        const knownVersions = await call(versions)({ name: image })
        const versionsWithDates = knownVersions.map(version => ({
            url: version.url,
            name: version.name,
            tag: version.tag,
            lastUpdated: moment(version.lastUpdated).toISOString()
        }))

        return {
            title: "Spacegun ∞ Images ∞ " + image,
            name: image,
            versions: versionsWithDates
        }
    }
}

