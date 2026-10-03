import { http, HttpResponse } from 'msw'
import {
    mockComponents,
    mockComponentDetails,
    mockGlobalStats,
    mockTopFiles,
    mockHistory,
    mockDiffs,
    mockFileRevisions,
    mockFileById,
    mockReleasesForFile,
    componentRef,
    toPage,
} from './data'

const paginate = (all, url) => {
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 10)
    const start = page * size
    return toPage(all.slice(start, start + size), page, size, all.length)
}

// Find a ClassDiffDTO entry by id across all diff fixtures so every
// diff link (/file/:id) resolves to a plausible ProjectFile.
const findDiffEntry = (id) => {
    for (const diff of Object.values(mockDiffs)) {
        for (const section of [diff.added, diff.removed, diff.modified]) {
            const entry = (section ?? []).find((f) => String(f.id) === String(id))
            if (entry) return entry
        }
    }
    return null
}

const toProjectFile = (entry) => {
    const isCode = entry.fqn.endsWith('.class')
    const ext = entry.fqn.includes('.') ? entry.fqn.split('.').pop() : 'unknown'
    return {
        id: entry.id,
        fqn: entry.fqn,
        fileType: isCode ? 'class' : ext,
        code: isCode,
        isCode,
        sha512: entry.sha512,
        sizeBytes: entry.sizeBytes,
        releaseCount: 2,
    }
}

// All notations that can denote the same stored file.
const fqnForms = (value) => {
    const forms = new Set([value])
    if (value.includes('/')) {
        forms.add(value.replace(/\//g, '.'))
    } else if (value.endsWith('.class')) {
        const base = value.slice(0, -'.class'.length)
        forms.add(base)
        forms.add(`${base.replace(/\./g, '/')}.class`)
        forms.add(base.replace(/\./g, '/'))
    } else if (value) {
        forms.add(`${value}.class`)
        forms.add(value.replace(/\./g, '/'))
        forms.add(`${value.replace(/\./g, '/')}.class`)
    }
    return forms
}

const formsOverlap = (a, b) => {
    for (const form of a) {
        if (b.has(form)) return true
    }
    return false
}

// Resolve a search string to its revision rows, or [] when unknown
// (empty page makes the search bar show "FQN not found").
export const findRevisions = (fqn) => {
    if (!fqn) return []
    if (mockFileRevisions[fqn]) return mockFileRevisions[fqn]
    const wanted = fqnForms(fqn)
    for (const [key, revisions] of Object.entries(mockFileRevisions)) {
        if (formsOverlap(fqnForms(key), wanted)) return revisions
    }
    for (const top of mockTopFiles) {
        if (formsOverlap(fqnForms(top.fqn), wanted)) return [top]
    }
    return []
}

export const handlers = [
    // GET /components?status=&page=&size=&sort= -> Page<ComponentListDTO>
    http.get('*/api/v1/components', ({ request }) => {
        const url = new URL(request.url)
        const statusParam = url.searchParams.get('status')
        let list = mockComponents
        if (statusParam) {
            const wanted = statusParam.split(',')
            list = list.filter((c) => wanted.includes(c.status))
        }
        return HttpResponse.json(paginate(list, url))
    }),

    // GET /components/:groupId/:artifactId/exists -> boolean
    http.get('*/api/v1/components/:groupId/:artifactId/exists', () => {
        return HttpResponse.json(true)
    }),

    // GET /top-files -> ProjectFile[]
    http.get('*/api/v1/top-files', () => {
        return HttpResponse.json(mockTopFiles)
    }),

    // GET /redundancy/stats -> GlobalStatsDTO
    http.get('*/api/v1/redundancy/stats', () => {
        return HttpResponse.json(mockGlobalStats)
    }),

    // GET /redundancy/:groupId/:artifactId/history -> ReleaseHistoryPointDTO[]
    http.get('*/api/v1/redundancy/:groupId/:artifactId/history', ({ params, request }) => {
        const url = new URL(request.url)
        const key = `${params.groupId}:${params.artifactId}`
        const history = mockHistory[key]
        if (!history) return HttpResponse.json([])
        if (Array.isArray(history)) return HttpResponse.json(history)
        return HttpResponse.json(url.searchParams.get('codeOnly') === 'false' ? history.allFiles : history.codeOnly)
    }),

    // GET /redundancy/:groupId/:artifactId -> Component (+ releases)
    http.get('*/api/v1/redundancy/:groupId/:artifactId', ({ params }) => {
        const key = `${params.groupId}:${params.artifactId}`
        const detail = mockComponentDetails[key]
        if (!detail) {
            return new HttpResponse('Analysis pending', { status: 202 })
        }
        return HttpResponse.json(detail)
    }),

    // GET /releases/:groupId/:artifactId/:version/diff -> ReleaseDiffDTO
    http.get('*/api/v1/releases/:groupId/:artifactId/:version/diff', ({ params, request }) => {
        const url = new URL(request.url)
        const baseVersion = url.searchParams.get('baseVersion')
        const codeOnly = url.searchParams.get('codeOnly') ?? 'true'
        const autoKey = `${params.groupId}:${params.artifactId}:${params.version}:auto:${codeOnly}`
        const baseKey = baseVersion
            ? `${params.groupId}:${params.artifactId}:${params.version}:${baseVersion}:${codeOnly}`
            : null
        const diff = (baseKey && mockDiffs[baseKey]) || mockDiffs[autoKey] || {
            version: params.version,
            previousVersion: baseVersion || null,
            totalClasses: 0,
            totalSizeBytes: 0,
            added: [],
            addedSizeBytes: 0,
            removed: [],
            removedSizeBytes: 0,
            modified: [],
            modifiedSizeBytes: 0,
        }
        return HttpResponse.json(diff)
    }),

    // GET /files/revisions?fqn=&page=&size= -> Page<ProjectFile>
    // Must come before /files/:id or MSW would treat "revisions" as an id.
    // Matching mirrors the backend's tolerant lookup: exact first, then
    // normalized candidates (dot/slash separators, optional .class suffix).
    http.get('*/api/v1/files/revisions', ({ request }) => {
        const url = new URL(request.url)
        const fqn = (url.searchParams.get('fqn') ?? '').trim()
        const all = findRevisions(fqn)
        return HttpResponse.json(paginate(all, url))
    }),

    // GET /files/:id/releases -> Page<Release>
    http.get('*/api/v1/files/:id/releases', ({ params, request }) => {
        const url = new URL(request.url)
        const all = mockReleasesForFile[params.id] ?? (findDiffEntry(params.id)
            ? [
                { id: 13, version: '3.14.0', status: 'READY', component: componentRef(1, 'org.apache.commons', 'commons-lang3') },
                { id: 12, version: '3.13.0', status: 'READY', component: componentRef(1, 'org.apache.commons', 'commons-lang3') },
            ]
            : [])
        return HttpResponse.json(paginate(all, url))
    }),

    // GET /files/:id -> ProjectFile
    http.get('*/api/v1/files/:id', ({ params }) => {
        const diffEntry = findDiffEntry(params.id)
        const found =
            mockFileById[params.id] ??
            mockTopFiles.find((f) => String(f.id) === String(params.id)) ??
            Object.values(mockFileRevisions).flat().find((f) => String(f.id) === String(params.id)) ??
            (diffEntry ? toProjectFile(diffEntry) : null)
        if (!found) {
            return new HttpResponse(null, { status: 404 })
        }
        return HttpResponse.json(found)
    }),
]
