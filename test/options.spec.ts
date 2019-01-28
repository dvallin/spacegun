import { parse } from '../src/options'

describe('options', () => {
    describe('commands', () => {
        ;[
            'apply',
            'deploy',
            'restart',
            'deployments',
            'images',
            'namespaces',
            'pipelines',
            'pipelineSchedules',
            'pods',
            'run',
            'scalers',
            'snapshot',
        ].forEach(command => {
            it(`parses ${command}`, () => {
                process.argv = ['', '', command]
                expect(parse().command).toEqual(command)
            })
        })
    })

    describe('cluster', () => {
        it('parses', () => {
            process.argv = ['', '', '--cluster', 'my cluster']
            expect(parse().cluster).toEqual('my cluster')
        })

        it('supports shorthand', () => {
            process.argv = ['', '', '-c', 'my cluster']
            expect(parse().cluster).toEqual('my cluster')
        })
    })

    describe('cluster', () => {
        it('parses', () => {
            process.argv = ['', '', '--cluster', 'my cluster']
            expect(parse().cluster).toEqual('my cluster')
        })

        it('supports shorthand', () => {
            process.argv = ['', '', '-c', 'my cluster']
            expect(parse().cluster).toEqual('my cluster')
        })
    })

    describe('config', () => {
        it('parses', () => {
            process.argv = ['', '', '--config', 'my config']
            expect(parse().config).toEqual('my config')
        })
    })

    describe('deployment', () => {
        it('parses', () => {
            process.argv = ['', '', '--deployment', 'my deployment']
            expect(parse().deployment).toEqual('my deployment')
        })

        it('parses', () => {
            process.argv = ['', '', '-d', 'my deployment']
            expect(parse().deployment).toEqual('my deployment')
        })
    })

    describe('help', () => {
        it('parses', () => {
            process.argv = ['', '', '--help']
            expect(parse().command).toEqual('help')
        })

        it('parses', () => {
            process.argv = ['', '', '-h']
            expect(parse().command).toEqual('help')
        })
    })

    describe('cluster', () => {
        it('parses', () => {
            process.argv = ['', '', '--cluster', 'my cluster']
            expect(parse().cluster).toEqual('my cluster')
        })

        it('supports shorthand', () => {
            process.argv = ['', '', '-c', 'my cluster']
            expect(parse().cluster).toEqual('my cluster')
        })
    })

    describe('namespace', () => {
        it('parses', () => {
            process.argv = ['', '', '--namespace', 'my namespace']
            expect(parse().namespace).toEqual('my namespace')
        })

        it('supports shorthand', () => {
            process.argv = ['', '', '-n', 'my namespace']
            expect(parse().namespace).toEqual('my namespace')
        })
    })

    describe('pipeline', () => {
        it('parses', () => {
            process.argv = ['', '', '--pipeline', 'my pipeline']
            expect(parse().pipeline).toEqual('my pipeline')
        })

        it('supports shorthand', () => {
            process.argv = ['', '', '-p', 'my pipeline']
            expect(parse().pipeline).toEqual('my pipeline')
        })
    })

    describe('tag', () => {
        it('parses', () => {
            process.argv = ['', '', '--tag', 'my tag']
            expect(parse().tag).toEqual('my tag')
        })

        it('supports shorthand', () => {
            process.argv = ['', '', '-t', 'my tag']
            expect(parse().tag).toEqual('my tag')
        })
    })

    describe('version', () => {
        it('parses', () => {
            process.argv = ['', '', '--version']
            expect(parse().command).toEqual('version')
        })

        it('parses', () => {
            process.argv = ['', '', '-v']
            expect(parse().command).toEqual('version')
        })
    })

    describe('yes', () => {
        it('parses', () => {
            process.argv = ['', '', '--yes']
            expect(parse().yes).toBeTruthy()
        })

        it('parses', () => {
            process.argv = ['', '', '-y']
            expect(parse().yes).toBeTruthy()
        })
    })
})
