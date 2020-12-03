import { safeLoad } from 'js-yaml'
import { readdirSync, readFileSync } from 'fs'

import { PipelineDescription } from './model/PipelineDescription'
import { StepDescription } from './model/Step'

export function load(path: string = './pipelines'): Map<string, PipelineDescription> {
    let files: string[] = []
    try {
        files = readdirSync(path)
    } catch (e) {}
    const jobs: Map<string, PipelineDescription> = new Map()
    for (const file of files) {
        const name = file.split('.')[0]
        const filePath = `${path}/${file}`
        const fileContent = readFileSync(filePath, 'utf8')
        const partial = safeLoad(fileContent) as Partial<PipelineDescription>
        jobs.set(name, validatePipeline(partial, name))
    }
    return jobs
}

export function validatePipeline(partial: Partial<PipelineDescription>, name: string): PipelineDescription {
    if (partial.cluster === undefined) {
        throw new Error(`job ${name} must contain a cluster`)
    }
    if (partial.steps === undefined) {
        throw new Error(`job ${name} must contain steps`)
    }
    if (partial.start === undefined) {
        throw new Error(`job ${name} must contain an start step`)
    }

    const steps = validateSteps(partial.steps, name, partial.cluster)
    return { name, steps, cluster: partial.cluster, cron: partial.cron, start: partial.start }
}

export function validateSteps(steps: Partial<StepDescription>[], name: string, cluster: string): StepDescription[] {
    return steps.map(step => validateStep(step, name, cluster))
}

export function validateStep(step: Partial<StepDescription>, name: string, cluster: string): StepDescription {
    if (step.name === undefined) {
        throw new Error(`a step of job ${name} has no name`)
    }
    let clusterForStepDescription = step.cluster
    switch (step.type) {
        case 'planClusterDeployment': {
            if (step.cluster === undefined) {
                throw new Error(`in step ${step.name} of job ${name} the cluster expression is missing`)
            }
            if (step.cluster === cluster) {
                throw new Error(`in step ${step.name} of job ${name} the cluster expression cannot be the source`)
            }
            break
        }
        case 'planNamespaceDeployment': {
            if (step.filter !== undefined && step.filter.namespaces !== undefined && step.filter.namespaces.length > 0) {
                throw new Error(`in step ${step.name} of job ${name} you are not allowed to define a namespace filter`)
            }
            if (step.source === undefined) {
                throw new Error(`in step ${step.name} of job ${name} the source namespace is missing`)
            }
            if (step.target === undefined) {
                throw new Error(`in step ${step.name} of job ${name} the target namespace is missing`)
            }
            if (step.cluster === undefined) {
                clusterForStepDescription = cluster
            }
            break
        }
        case 'clusterProbe': {
            if (step.hook === undefined) {
                throw new Error(`in step ${step.name} of job ${name} the probe is missing`)
            }
            break
        }
        case 'logError':
        case 'planImageDeployment':
        case 'applyDeployment':
        case 'takeSnapshot':
        case 'rollback':
            break
        default:
            throw new Error(`${step.type} of job ${name} is not a valid step type`)
    }
    return {
        name: step.name!,
        type: step.type!,
        onSuccess: step.onSuccess,
        onFailure: step.onFailure,

        cluster: clusterForStepDescription,
        source: step.source,
        target: step.target,
        tag: step.tag,
        hook: step.hook,
        timeout: step.timeout,
        filter: step.filter,
        semanticTagExtractor: step.semanticTagExtractor,
    }
}
