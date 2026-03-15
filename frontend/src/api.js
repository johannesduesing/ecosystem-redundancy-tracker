import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api/v1'

const api = axios.create({
    baseURL: API_BASE_URL,
})

export const fetchComponents = async (status, page = 0, size = 12, sort = '') => {
    const params = { page, size }
    if (status) {
        params.status = Array.isArray(status) ? status.join(',') : status
    }
    if (sort) {
        params.sort = sort
    }
    const response = await api.get('/components', { params })
    return response.data
}

export const fetchComponentRedundancy = async (groupId, artifactId) => {
    const response = await api.get(`/redundancy/${groupId}/${artifactId}`)
    return response.data
}

export const fetchComponentHistory = async (groupId, artifactId) => {
    const response = await api.get(`/redundancy/${groupId}/${artifactId}/history`)
    return response.data
}

export const fetchReleaseDiff = async (groupId, artifactId, version, baseVersion = null) => {
    const params = {}
    if (baseVersion) {
        params.baseVersion = baseVersion
    }
    const response = await api.get(`/releases/${groupId}/${artifactId}/${version}/diff`, { params })
    return response.data
}

export const fetchReleasesForClass = async (id, page = 0, size = 10) => {
    const response = await api.get(`/classes/${id}/releases`, { params: { page, size } })
    return response.data
}

export const fetchClassDetails = async (id) => {
    const response = await api.get(`/classes/${id}`)
    return response.data
}

export const fetchClassRevisions = async (fqn, page = 0, size = 30, sort = 'releaseCount,desc') => {
    const response = await api.get(`/classes/revisions`, { params: { fqn, page, size, sort } })
    return response.data
}

export const fetchTopClasses = async () => {
    const response = await api.get('/top-classes')
    return response.data
}

export const checkComponentExists = async (groupId, artifactId) => {
    try {
        const response = await api.get(`/components/${groupId}/${artifactId}/exists`);
        return response.data;
    } catch (e) {
        return false;
    }
}

export default api
