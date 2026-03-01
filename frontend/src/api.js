import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api/v1'

const api = axios.create({
    baseURL: API_BASE_URL,
})

export const fetchComponents = async (status, page = 0, size = 12) => {
    const params = { page, size }
    if (status) {
        params.status = Array.isArray(status) ? status.join(',') : status
    }
    const response = await api.get('/components', { params })
    return response.data
}

export const fetchComponentRedundancy = async (groupId, artifactId) => {
    const response = await api.get(`/redundancy/${groupId}/${artifactId}`)
    return response.data
}

export const fetchReleaseDiff = async (groupId, artifactId, version) => {
    const response = await api.get(`/releases/${groupId}/${artifactId}/${version}/diff`)
    return response.data
}

export const fetchReleasesForClass = async (id, page = 0, size = 10) => {
    const response = await api.get(`/classes/${id}/releases`, { params: { page, size } })
    return response.data
}

export const fetchTopClasses = async () => {
    const response = await api.get('/top-classes')
    return response.data
}

export default api
