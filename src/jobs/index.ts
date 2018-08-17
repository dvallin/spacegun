import { safeLoad } from "js-yaml"
import { readFileSync, readdirSync } from "fs"

import { Job } from "@/jobs/model/Job"
import { JobSource } from "@/jobs/model/JobSource"

export function load(path: string = "./jobs"): Map<string, Job> {
    const files = readdirSync(path)
    const jobs: Map<string, Job> = new Map()
    for (const file of files) {
        const name = file.split(".")[0]
        const filePath = `${path}/${file}`
        const fileContent = readFileSync(filePath, 'utf8')
        const partial = safeLoad(fileContent) as Partial<Job>
        jobs.set(name, validateJob(partial, name))
    }
    return jobs
}

export function validateJob(partial: Partial<Job>, name: string): Job {
    if (partial.cluster === undefined) {
        throw new Error(`job ${name} must contain a cluster`)
    }
    if (partial.from === undefined) {
        throw new Error(`job ${name} must contain a source`)
    }

    const from = validateJobSource(partial.from, name, partial.cluster)
    return { name, cluster: partial.cluster, from, cron: partial.cron }
}

export function validateJobSource(partial: Partial<JobSource>, name: string, cluster: string): JobSource {
    let source: JobSource
    switch (partial.type) {
        case "cluster": {
            if (partial.expression === undefined) {
                throw new Error(`the source of job ${name} must have a cluster expression`)
            }
            if (partial.expression === cluster) {
                throw new Error(`the source of job ${name} cannot be its target`)
            }
            source = { type: "cluster", expression: partial.expression }
            break
        }
        case "image": {
            if (partial.expression === undefined) {
                source = { type: "image", expression: "^.*$" }
            } else {
                source = { type: "image", expression: partial.expression }
            }
            break
        }
        default:
            throw new Error(`${partial.type} of job ${name} is not a valid source type`)
    }
    return source
}
