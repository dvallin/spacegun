import { safeLoad } from "js-yaml"
import { readFileSync } from "fs"
import { homedir } from "os"

export interface Config {
    kube: string,
    docker: string
}

export function load(path: string = "./config.yml"): Config | Error {
    try {
        const doc = safeLoad(readFileSync(path, 'utf8')) as Partial<Config>
        if (doc.kube === undefined) {
            doc.kube = homedir() + "/.kube/config"
        }
        return doc as Config
    } catch (e) {
        return e
    }
}
