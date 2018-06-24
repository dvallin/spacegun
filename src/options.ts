import * as commandLineArgs from 'command-line-args'
import { homedir } from 'os'

import { Command } from '@/commands'

export interface Options {
    kube: string
    command: Command
}

function parse(): Options {
    const internalOptions = commandLineArgs([
        { name: 'command', defaultOption: true, defaultValue: "help" },
        { name: 'kube', alias: 'k', type: String }
    ]) as {
            kube?: string
            command?: string
        }

    let command: Command = "help"
    if (internalOptions.command !== undefined) {
        switch (internalOptions.command) {
            case "scalers":
            case "pods":
            case "deployments":
                command = internalOptions.command
                break
        }
    }

    let kube = homedir() + "/.kube/config"
    if (internalOptions.kube !== undefined) {
        kube = internalOptions.kube
    }

    return { kube, command }
}

export { parse }
