import * as commandLineArgs from 'command-line-args'
import { homedir } from 'os'

export type Command = "pods" | "deployments" | "scalers"

export interface Options {
    kube: string
    command: Command
}

function parse(): Options {
    const internalOptions = commandLineArgs([
        { name: 'command', defaultOption: true },
        { name: 'kube', alias: 'k', type: String }
    ]) as {
            kube?: string
            command?: string
        }

    let command: Command = "pods"
    if (internalOptions.command !== undefined) {
        switch (internalOptions.command) {
            case "scalers":
            case "pods":
            case "deployments":
                command = internalOptions.command
                break
            default:
                throw new Error(`${internalOptions.command} is not a valid command. Must be one of 'scalers' 'pods' 'deployments'`)
        }
    }

    let kube = homedir() + "/.kube/config"
    if (internalOptions.kube !== undefined) {
        kube = internalOptions.kube
    }

    return { kube, command }
}

export { parse }
