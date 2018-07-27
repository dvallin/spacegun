import { safeLoad } from "js-yaml"
import { readFileSync } from "fs"
import { homedir } from "os"

export interface Config {
    kube: string,
    docker: string,
    jobs: string,
}

export function load(path: string = "./config.yml"): Config | Error {
    try {
        const doc = safeLoad(readFileSync(path, 'utf8')) as Partial<Config>
        return validateConfig(doc)
    } catch (e) {
        return e
    }
}

export function validateConfig(partial: Partial<Config>): Config {
    const {
        kube = homedir() + "/.kube/config",
        jobs = "./jobs",
        docker
    } = partial

    if (docker === undefined) {
        throw new Error(`a docker endpoint is needed`)
    }
    return { kube, jobs, docker }
}
