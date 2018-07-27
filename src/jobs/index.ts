import { safeLoad } from "js-yaml"
import { readFileSync, readdirSync } from "fs"

import { Job } from "@/jobs/model/Job"
import { JobSource } from "@/jobs/model/JobSource";

export function load(path: string = "./jobs"): Map<string, Job> {
    const files = readdirSync(path)
    const jobs: Map<string, Job> = new Map()
    for (const file of files) {
        const name = file.split(".")[0]
        const filePath = `${path}/${file}`
        const doc = safeLoad(readFileSync(filePath, 'utf8')) as Partial<Job>
        if (doc.cluster === undefined) {
            throw new Error(`job ${name} must contain a cluster`)
        }
        if (doc.from === undefined) {
            throw new Error(`job ${name} must contain a source`)
        }

        let from: JobSource
        switch (doc.from.type) {
            case "cluster": {
                if (doc.from.expression === undefined) {
                    throw new Error(`the source of job ${name} must have a cluster expression`)
                }
                if (doc.from.expression === doc.cluster) {
                    throw new Error(`the source of job ${name} cannot be its target`)
                }
                from = doc.from
                break
            }
            case "image": {
                if (doc.from.expression === undefined) {
                    from = { type: doc.from.type, expression: "^.*$" }
                } else {
                    from = { type: doc.from.type, expression: doc.from.expression }
                }
                break
            }
            default:
                throw new Error(`${doc.from.type} in job ${file} is not a valid source type`)
        }
        jobs.set(name, { cluster: doc.cluster, from, cron: doc.cron })
    }
    return jobs
}

