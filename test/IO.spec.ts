import { IO } from '../src/IO'
import { Readable, ReadableOptions } from 'stream'

beforeEach(() => {
    jest.clearAllMocks()
})

describe('out', () => {
    it('should print to console', () => {
        // given
        jest.spyOn(global.console, 'log')
        const io: IO = new IO()
        const message = 'test message for out'

        // when
        io.out(message)

        // then
        expect(console.log).toHaveBeenCalledWith(message)
    })
})

describe('error', () => {
    it('should print to console', () => {
        // given
        jest.spyOn(global.console, 'error')
        const io: IO = new IO()
        const error = new Error('test message for out')

        // when
        io.error(error)

        // then
        expect(console.error).toHaveBeenCalledWith(error)
    })
})

describe('expect', () => {
    it('should print question', async () => {
        // given
        jest.spyOn(process.stdout, 'write')
        const response: string = 'any'
        const io: IO = new IO(new RespondOnce(response))
        const message = 'test message for expect'

        // when
        await io.expect(message, response)

        // then
        expect(process.stdout.write).toHaveBeenCalledWith(message)
    })

    it('should accept expected answer', async () => {
        // given
        const expectedAnswer: string = 'yes'
        const io: IO = new IO(new RespondOnce(expectedAnswer))

        // when
        const answer = await io.expect('', expectedAnswer)

        // then
        expect(answer).toEqual(true)
    })

    it('should reject unexpected answer', async () => {
        // given
        const expectedAnswer: string = 'yes'
        const io: IO = new IO(new RespondOnce('no'))

        // when
        const answer = await io.expect('', expectedAnswer)

        // then
        expect(answer).toEqual(false)
    })
})

describe('choose', () => {
    it('should print question', async () => {
        // given
        jest.spyOn(process.stdout, 'write')
        const io: IO = new IO(new RespondOnce(0))
        const message = 'test message for expect'

        // when
        await io.choose(message, ['1'])

        // then
        expect(process.stdout.write).toHaveBeenCalledWith(message)
    })

    it('should accept on one of the options', async () => {
        // given
        const responseIndex: number = 1
        const io: IO = new IO(new RespondOnce(responseIndex))

        // when
        const answer = await io.choose('', ['1', '2', '3'])

        // then
        expect(answer).toEqual('2')
    })

    const outOfRangeIndices: number[] = [-1, 3]
    outOfRangeIndices.forEach((val: number) => {
        it(`should reject on chosen index ${val} out of range`, () => {
            // given
            const io: IO = new IO(new RespondOnce(val))

            // when + then
            return expect(io.choose('', ['1', '2', '3'])).rejects.toEqual(new Error(`${val} is not in the valid range`))
        })
    })
})

describe('chooseMultiple', () => {
    it('should print question', async () => {
        // given
        jest.spyOn(process.stdout, 'write')
        const io: IO = new IO(new RespondOnce(0))
        const message = 'test message for expect'

        // when
        await io.chooseMultiple(message, ['1'], ['2', '3'])

        // then
        expect(process.stdout.write).toHaveBeenCalledWith(message)
    })

    it('should accept on one of the options', async () => {
        // given
        const responseIndex: number = 0
        const io: IO = new IO(new RespondOnce(responseIndex))

        // when
        const answer = await io.chooseMultiple('', ['1'], ['2', '3'])

        // then
        expect(answer.result).toEqual('1')
        expect(answer.first).toBeTruthy()
    })

    it('should accept on one of the options', async () => {
        // given
        const responseIndex: number = 1
        const io: IO = new IO(new RespondOnce(responseIndex))

        // when
        const answer = await io.chooseMultiple('', ['1'], ['2', '3'])

        // then
        expect(answer.result).toEqual('2')
        expect(answer.first).toBeFalsy()
    })

    const outOfRangeIndices: number[] = [-1, 3]
    outOfRangeIndices.forEach((val: number) => {
        it(`should reject on chosen index ${val} out of range`, () => {
            // given
            const io: IO = new IO(new RespondOnce(val))

            // when + then
            return expect(io.chooseMultiple('', ['1'], ['2', '3'])).rejects.toEqual(new Error(`${val} is not in the valid range`))
        })
    })
})

class RespondOnce extends Readable {
    pushed: boolean = false
    response: number | string

    constructor(response: number | string, opt?: ReadableOptions) {
        super(opt)
        this.response = response
    }

    _read() {
        if (this.pushed) {
            this.push(null)
        } else {
            this.push(this.response + '\n')
            this.pushed = true
        }
    }
}
