import { DockerImageRepository } from '../../../src/images/docker/DockerImageRepository'
import axios from 'axios'

import { axiosSuccess, axiosSuccessHeader } from '../../test-utils/axios'

describe('DockerImageProvider', () => {
    let provider: DockerImageRepository
    beforeEach(() => {
        provider = DockerImageRepository.fromConfig('http://repo')
    })

    it('extracts the repository name from the url', () => {
        expect(provider.repository).toEqual('repo')
    })

    describe('list', () => {
        const images = ['image1', 'image2']

        beforeEach(() => {
            //@ts-ignore
            axios.get = axiosSuccess({ repositories: images })
        })

        it('retrieves images', async () => {
            expect(provider.list()).resolves.toEqual(images)
            expect(axios.get).toHaveBeenCalledWith('http://repo/v2/_catalog')
        })

        it('caches images', async () => {
            await provider.list()
            await provider.list()
            expect(axios.get).toHaveBeenCalledTimes(1)
        })
    })

    describe('tags', () => {
        const tags = ['tag1', 'tag2']

        beforeEach(() => {
            //@ts-ignore
            axios.get = axiosSuccess({ tags })
        })

        it('retrieves tags', () => {
            expect(provider.tags('someImage')).resolves.toEqual(tags)
            expect(axios.get).toHaveBeenCalledWith('http://repo/v2/someImage/tags/list')
        })

        it('caches tags', async () => {
            await provider.tags('someImage1')
            await provider.tags('someImage2')
            await provider.tags('someImage1')
            expect(axios.get).toHaveBeenCalledTimes(2)
        })
    })

    describe('image', () => {
        beforeEach(() => {
            //@ts-ignore
            axios.get = axiosSuccessHeader({ 'docker-content-digest': 'abcd' })
        })

        it('retrieves images', () => {
            expect(provider.image('someImage')).resolves.toEqual({ name: 'someImage', tag: 'latest', url: 'repo/someImage:latest@abcd' })
            expect(axios.get).toHaveBeenCalledWith('http://repo/v2/someImage/manifests/latest', {
                headers: { accept: 'application/vnd.docker.distribution.manifest.v2+json' },
            })
        })

        it('retrieves images with tags', () => {
            expect(provider.image('someImage', 'someTag')).resolves.toEqual({
                name: 'someImage',
                tag: 'someTag',
                url: 'repo/someImage:someTag@abcd',
            })
            expect(axios.get).toHaveBeenCalledWith('http://repo/v2/someImage/manifests/someTag', {
                headers: { accept: 'application/vnd.docker.distribution.manifest.v2+json' },
            })
        })

        it('caches tags', async () => {
            await provider.image('someImage1')
            await provider.image('someImage2')
            await provider.image('someImage1', 'tag1')
            await provider.image('someImage1')
            await provider.image('someImage1', 'tag1')
            expect(axios.get).toHaveBeenCalledTimes(3)
        })
    })
})
