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

export const fetchComponentHistory = async (groupId, artifactId, codeOnly = true) => {
    const response = await api.get(`/redundancy/${groupId}/${artifactId}/history`, { params: { codeOnly } })
    return response.data
}

export const fetchReleaseDiff = async (groupId, artifactId, version, baseVersion = null, codeOnly = true) => {
    const params = { codeOnly }
    if (baseVersion) {
        params.baseVersion = baseVersion
    }
    const response = await api.get(`/releases/${groupId}/${artifactId}/${version}/diff`, { params })
    return response.data
}

export const fetchReleasesForFile = async (id, page = 0, size = 10) => {
    const response = await api.get(`/files/${id}/releases`, { params: { page, size } })
    return response.data
}

export const fetchFileDetails = async (id) => {
    const response = await api.get(`/files/${id}`)
    return response.data
}

export const fetchFileRevisions = async (fqn, page = 0, size = 30, sort = 'releaseCount,desc') => {
    const response = await api.get(`/files/revisions`, { params: { fqn, page, size, sort } })
    return response.data
}

export const fetchTopFiles = async () => {
    const response = await api.get('/top-files')
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

export const fetchGlobalStats = async () => {
    const response = await api.get('/redundancy/stats')
    return response.data
}

export default api
