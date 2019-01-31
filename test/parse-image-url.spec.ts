import { parseImageUrl } from '../src/parse-image-url'

describe('parseImageUrl', () => {
    it('extracts from plain image name', () => {
        expect(parseImageUrl('nginx')).toEqual({
            host: '',
            name: 'nginx',
        })
    })

    it('extracts from default host and no hash', () => {
        expect(parseImageUrl('nginx:latest')).toEqual({
            host: '',
            name: 'nginx',
            tag: 'latest',
        })
    })

    it('extracts from default host', () => {
        expect(parseImageUrl('nginx:latest@sha256:12345')).toEqual({ host: '', name: 'nginx', tag: 'latest', hash: 'sha256:12345' })
    })

    it('extracts from fancy host', () => {
        expect(parseImageUrl('some-fancy-url.com/nginx:latest@sha256:12345')).toEqual({
            host: 'some-fancy-url.com',
            name: 'nginx',
            tag: 'latest',
            hash: 'sha256:12345',
        })
    })

    it('extracts from localhost', () => {
        expect(parseImageUrl('localhost:5000/nginx:latest@sha256:12345')).toEqual({
            host: 'localhost:5000',
            name: 'nginx',
            tag: 'latest',
            hash: 'sha256:12345',
        })
    })
})
