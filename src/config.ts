import { safeLoad } from "js-yaml"
import { readFileSync } from "fs"
import { homedir } from "os"
import { parse } from "path"

export interface ServerConfig {
    host: string
    port: number
}

export interface Config {
    kube: string
    docker: string
    jobs: string
    server: ServerConfig
}

export function load(filePath: string = "./config.yml"): Config | Error {
    const path = parse(filePath)
    process.chdir(path.dir)

    try {
        const doc = safeLoad(readFileSync(path.base, 'utf8')) as Partial<Config>
        return validateConfig(doc)
    } catch (e) {
        console.error(e)
        return e
    }
}

export function validateConfig(partial: Partial<Config>): Config {
    const {
        kube = homedir() + "/.kube/config",
        jobs = "./jobs",
        server = {},
        docker,
    } = partial

    if (docker === undefined) {
        throw new Error(`a docker endpoint is needed`)
    }

    return { kube, jobs, server: validateServerConfig(server), docker }
}

export function validateServerConfig(partial: Partial<ServerConfig>): ServerConfig {
    const {
        port = Number.parseInt(process.env.SERVER_PORT || "3000"),
        host = process.env.SERVER_HOST || "localhost"
    } = partial

    return { port, host }
}
