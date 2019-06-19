import { IO } from '../../src/IO'

export function createIO(
    mocks: Partial<{ choose: jest.Mock<{}>; chooseMultiple: jest.Mock<{}>; expect: jest.Mock<{}>; out: jest.Mock<{}> }> = {}
): IO {
    const io = new IO()
    io.out = mocks.out || jest.fn()
    io.expect = mocks.expect || jest.fn()
    io.chooseMultiple = mocks.chooseMultiple || jest.fn()
    io.choose = mocks.choose || jest.fn()
    return io
}
