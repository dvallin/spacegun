import * as commandLineArgs from "command-line-args"

import { Command } from "@/commands"

export interface Options {
    config?: string
    command: Command
}

function parse(): Options {
    const internalOptions = commandLineArgs([
        { name: 'command', defaultOption: true, defaultValue: "help" },
        { name: 'config', alias: 'c', type: String }
    ]) as {
            command?: string,
            config?: string
        }

    let command: Command = "help"
    if (internalOptions.command !== undefined) {
        switch (internalOptions.command) {
            case "scalers":
            case "namespaces":
            case "images":
            case "pods":
            case "deployments":
            case "jobs":
            case "jobSchedules":
            case "run":
            case "deploy":
                command = internalOptions.command
                break
        }
    }

    return { command, config: internalOptions.config }
}

export { parse }
