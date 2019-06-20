import chalk from 'chalk'
import * as moment from 'moment'

import { CommandFn } from './'
import { Options } from '../options'

import * as jobsModule from '../jobs/JobsModule'

import { call } from '../dispatcher'
import { pad } from '../pad'
import { IO } from '../IO'

import { load, applyWithConsent } from './helpers'

import { PipelineDescription } from '../jobs/model/PipelineDescription'
import { logDeployment } from './deployments'
import { DeploymentPlan, DeployableResource } from 'src/jobs/model/DeploymentPlan'

export const pipelinesCommand: CommandFn = async ({  }: Options, io: IO) => pipelines(io)
export const pipelineSchedulesCommand: CommandFn = async (options: Options, io: IO) => pipelineSchedules(options, io)
export const runCommand: CommandFn = async (options: Options, io: IO) => run(options, io)

async function pipelines(io: IO) {
    const pipelines = await load(call(jobsModule.pipelines)())
    logPipelineHeader(io)
    pipelines.forEach(pipeline => {
        io.out(chalk.bold(pad(pipeline.name, 2)) + pad(`${pipeline.steps.length}`, 4) + pad(pipeline.cluster, 2))
    })
}

async function pipelineSchedules(options: Options, io: IO) {
    const pipeline = await choosePipeline(options, io)

    const schedules = await call(jobsModule.schedules)(pipeline)
    logPipelineHeader(io)
    io.out(chalk.bold(pad(pipeline.name, 2)) + pad(`${pipeline.steps.length}`, 4) + pad(pipeline.cluster, 2))
    io.out('')
    if (schedules !== undefined && schedules.nextRuns !== undefined) {
        if (schedules.lastRun !== undefined) {
            io.out(chalk.magenta(pad('last run', 2)) + moment(schedules.lastRun).toISOString())
        } else {
            io.out(chalk.magenta.bold('not run yet!'))
        }
        io.out('')
        io.out(chalk.underline.bold(pad('scheduled runs', 8)))
        schedules.nextRuns.forEach(run => {
            io.out(moment(run).toISOString())
        })
    } else {
        io.out(chalk.magenta.bold('not scheduling this pipeline!'))
    }
}

async function run(options: Options, io: IO) {
    const pipeline = await choosePipeline(options, io)

    const plan = await call(jobsModule.plan)(pipeline)

    io.out(chalk.bold(`planned deployment ${plan.name}`))
    io.out(chalk.bold(`planned service deployment updates`))
    plan.deployments.forEach(deploymentPlan => logDeploymentPlan(deploymentPlan, io))
    io.out(chalk.bold(`planned batch deployment updates`))
    plan.batches.forEach(deploymentPlan => logDeploymentPlan(deploymentPlan, io))

    const result = await applyWithConsent(options, io, () => call(jobsModule.run)(plan))
    if (result) {
        io.out(chalk.bold('Successfully applied plan. Changed deployments are.'))
        result.forEach(deployment => {
            logDeployment(io, deployment)
        })
    } else {
        io.out(chalk.bold('Did not apply plan.'))
    }
}

function logDeploymentPlan<T extends DeployableResource>(deploymentPlan: DeploymentPlan<T>, io: IO) {
    let previousUrl = 'none'
    if (deploymentPlan.deployable.image !== undefined) {
        previousUrl = deploymentPlan.deployable.image.url
    }
    io.out(
        pad(`${deploymentPlan.deployable.name}`, 3) +
            chalk.bold(pad(`${previousUrl}`, 5)) +
            chalk.magenta(pad('=>', 1)) +
            chalk.bold(pad(`${deploymentPlan.image.url}`, 5))
    )
}

function logPipelineHeader(io: IO) {
    io.out(chalk.bold(pad('name', 2) + pad('from', 4) + pad('to', 2)))
}

async function choosePipeline(options: Options, io: IO): Promise<PipelineDescription> {
    const pipelines = await call(jobsModule.pipelines)()

    if (options.pipeline) {
        const pipeline = pipelines.find(p => p.name === options.pipeline)
        if (!pipeline) {
            throw new Error(`pipeline ${options.pipeline} does not exist`)
        }
        return pipeline
    } else {
        io.out('Choose the target pipeline')
        pipelines.forEach((pipeline, index) => {
            io.out(chalk.bold.cyan(index.toString()) + ': ' + pad(pipeline.name, 5))
        })
        return io.choose('> ', pipelines)
    }
}
