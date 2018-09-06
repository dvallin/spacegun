import { IO } from "../src/IO"
import { Readable, ReadableOptions } from "stream"

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

describe('choose', () => {
    it('should print question', () => {
        // given
        jest.spyOn(process.stdout, 'write')
        const io: IO = new IO(new RespondOnce(0))
        const message = 'test message for expect'

        // when
        return io.choose(message, ['1'])
            .finally(() => {
                // then
                expect(process.stdout.write).toHaveBeenCalledWith(message)
            })
    })

    it('should accept on one of the options', () => {
        // given
        const responseIndex: number = 1
        const options: string[] = ['1', '2', '3']
        const io: IO = new IO(new RespondOnce(responseIndex))

        // when + then
        return expect(
            io.choose('', options)
        ).resolves.toEqual(options[responseIndex])
    })

    const outOfRangeIndices: number[] = [-1, 3]
    outOfRangeIndices.forEach((val: number) => {
        it(`should reject on chosen index ${val} out of range`, () => {
            // given
            const options: string[] = ['1', '2', '3']
            const io: IO = new IO(new RespondOnce(val))

            // when + then
            return expect(
                io.choose('', options)
            ).rejects.toEqual(new Error(`${val} is not in the valid range`))
        })
    })
})

class RespondOnce extends Readable {
    pushed: boolean = false
    response: number | string

    constructor(response: number | string, opt?: ReadableOptions) {
        super(opt);
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
