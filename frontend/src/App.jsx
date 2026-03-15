import { useState, useRef } from 'react'
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Search, Home, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight, FileCode, Loader2, BarChart3, FileX, Package, History, Layers, Zap, RefreshCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchComponents, fetchComponentRedundancy, fetchReleaseDiff, fetchReleasesForFile, fetchTopFiles, fetchFileDetails, fetchFileRevisions, checkComponentExists, fetchComponentHistory, fetchGlobalStats } from './api'

const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 KB'
    const kb = bytes / 1024
    if (kb < 1024) return kb.toFixed(1) + ' KB'
    const mb = kb / 1024
    return mb.toFixed(1) + ' MB'
}

const formatFqn = (fqn) => {
    if (!fqn) return ''
    return fqn.endsWith('.class') ? fqn.slice(0, -6) : fqn
}

const formatNumber = (num) => {
    if (typeof num !== 'number') return num
    if (num < 1000) return num.toString()
    return (num / 1000).toFixed(1) + 'K'
}

function FqnSearchBar() {
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const navigate = useNavigate()

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!input.trim()) return

        let fqn = input.trim()
        if (!fqn.includes('.') && !fqn.endsWith('.class')) {
            // No extension provided, maybe it's still a class? 
            // In the new system we don't force it, but let's keep it simple for now and just search exactly as is.
        }

        setLoading(true)
        try {
            const data = await fetchFileRevisions(fqn, 0, 1)
            const count = data?.page?.totalElements ?? data?.totalElements ?? 0
            if (count > 0) {
                navigate(`/files/${encodeURIComponent(fqn)}`)
                setInput('')
            } else {
                setToast(`FQN not found in index.`)
                setTimeout(() => setToast(null), 3000)
            }
        } catch (err) {
            setToast("Error searching for FQN.")
            setTimeout(() => setToast(null), 3000)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative">
            <form onSubmit={handleSearch} className="flex relative items-center">
                <input
                    type="text"
                    placeholder="Quick find File..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-full py-1.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 ring-cyan-500/50 w-64 transition-all"
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="absolute right-2 text-neutral-500 hover:text-cyan-400 p-1 transition-colors"
                    disabled={loading}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
            </form>
            {toast && (
                <div className="absolute top-full right-0 mt-2 bg-red-900/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm whitespace-nowrap z-50 shadow-lg shadow-red-900/20 backdrop-blur-md">
                    {toast}
                </div>
            )}
        </div>
    )
}

function App() {
    return (
        <div className="min-h-screen flex flex-col bg-neutral-950">
            <header className="sticky top-0 z-50 glass-panel !rounded-none border-t-0 p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold flex items-center gap-2 group">
                        <Search className="text-cyan-500 group-hover:text-fuchsia-400 transition-colors" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 to-neutral-400 group-hover:from-cyan-400 group-hover:to-fuchsia-400 transition-all duration-300">
                            Ecosystem Redundancy Tracker
                        </span>
                    </Link>
                    <FqnSearchBar />
                </div>
            </header>

            <main className="flex-1 container mx-auto py-8 px-4">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/component/:groupId/:artifactId" element={<ComponentPage />} />
                    <Route path="/files/:fqn" element={<FileRevisionsPage />} />
                    <Route path="/file/:id" element={<FileRevisionDetailsPage />} />
                </Routes>
            </main>

            <footer className="p-8 text-center text-neutral-500 border-t border-neutral-900">
                &copy; 2026 Ecosystem Redundancy Tracker
            </footer>
        </div>
    )
}

function StatusBadge({ status }) {
    const configs = {
        READY: { color: 'text-green-500 bg-green-500/10', icon: CheckCircle2 },
        PENDING: { color: 'text-yellow-500 bg-yellow-500/10', icon: Clock },
        FAILED: { color: 'text-red-500 bg-red-500/10', icon: XCircle },
        NOT_FOUND: { color: 'text-neutral-500 bg-neutral-500/10', icon: AlertCircle },
    }
    const config = configs[status] || configs.NOT_FOUND
    const Icon = config.icon

    return (
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
            <Icon size={14} />
            {status}
        </span>
    )
}

function HomePage() {
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState(null)
    const [verifying, setVerifying] = useState(false)
    const navigate = useNavigate()

    const { data, isLoading, error } = useQuery({
        queryKey: ['components'],
        queryFn: () => fetchComponents(['PENDING', 'READY'], 0, 6, 'lastModified,desc'),
        refetchInterval: 5000,
    })

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['global-stats'],
        queryFn: fetchGlobalStats,
        refetchInterval: 10000,
    })

    const handleSearch = async (e) => {
        e.preventDefault()
        const parts = search.split(':')
        if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
            setToast('Input is not a valid component name.')
            setTimeout(() => setToast(null), 3000)
            return
        }
        const [groupId, artifactId] = parts.map(p => p.trim())

        setVerifying(true)
        try {
            const exists = await checkComponentExists(groupId, artifactId)
            if (!exists) {
                setToast('Component does not exist on Maven Central.')
                setTimeout(() => setToast(null), 3000)
                return
            }
            navigate(`/component/${groupId}/${artifactId}`)
        } catch (err) {
            setToast('Error verifying component existence.')
            setTimeout(() => setToast(null), 3000)
        } finally {
            setVerifying(false)
        }
    }

    return (
        <div className="space-y-12">
            <section className="text-center space-y-4 max-w-2xl mx-auto py-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-500/20 blur-[100px] rounded-full pointer-events-none" />
                <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-cyan-400 to-fuchsia-500 pb-2">
                    Investigate Redundancy
                </h1>
                <p className="text-neutral-400 text-lg">Analyze component releases to identify added, removed, and modified classes across the ecosystem.</p>
                <form onSubmit={handleSearch} className="relative flex bg-neutral-900 border border-neutral-800 rounded-full p-2 pl-6 focus-within:ring-2 ring-fuchsia-500/100 transition-all shadow-xl shadow-fuchsia-500/10">
                    <input
                        type="text"
                        placeholder="Search groupId:artifactId..."
                        className="flex-1 bg-transparent border-none outline-none py-2"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" disabled={verifying} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 px-8 py-2 rounded-full font-semibold transition-colors disabled:opacity-50">
                        {verifying ? (
                            <>
                                <Loader2 size={16} className="animate-spin inline mr-2" />
                                Verifying...
                            </>
                        ) : (
                            'Analyze'
                        )}
                    </button>
                    {toast && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-red-900/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm whitespace-nowrap z-50 shadow-lg shadow-red-900/20 backdrop-blur-md">
                            {toast}
                        </div>
                    )}
                </form>
            </section>

            <section className="space-y-8 py-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black flex items-center gap-3">
                        <Zap className="text-cyan-500" size={20} /> Index Insights
                    </h2>
                    {statsLoading && <Loader2 className="animate-spin text-neutral-500" size={14} />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <MetricCard
                        label="Components"
                        value={stats?.totalComponents ?? 0}
                        color="text-cyan-400"
                        icon={Package}
                    />
                    <MetricCard
                        label="Releases"
                        value={stats?.totalReleases ?? 0}
                        color="text-fuchsia-400"
                        icon={History}
                    />
                    <MetricCard
                        label="Unique Files"
                        value={stats?.totalUniqueFiles ?? 0}
                        color="text-blue-400"
                        icon={Layers}
                    />
                    <MetricCard
                        label="File Occurrences"
                        value={stats?.totalFileOccurrences ?? 0}
                        color="text-emerald-400"
                        icon={FileCode}
                    />
                    <MetricCard
                        label="Redundancy Coefficient"
                        value={(stats?.totalUniqueFiles > 0 ? (stats.totalFileOccurrences / stats.totalUniqueFiles).toFixed(1) : '0.0') + 'x'}
                        color="text-amber-400"
                        icon={RefreshCcw}
                    />
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Recently Indexed</h2>
                    {isLoading && <Clock className="animate-spin text-cyan-500" />}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 flex items-center gap-3">
                        <AlertCircle /> Failed to connect to API service.
                    </div>
                )}

                {data?.content?.length === 0 && !isLoading && (
                    <div className="glass-panel p-12 text-center text-neutral-500">
                        No components found. Start by analyzing a component above!
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.content?.map((comp) => (
                        <Link
                            key={`${comp.groupId}:${comp.artifactId}`}
                            to={`/component/${comp.groupId}/${comp.artifactId}`}
                            className="glass-panel p-6 hover:border-fuchsia-500/100 hover:bg-neutral-900 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors" />
                            <div className="relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-neutral-500 font-mono">{comp.groupId}</p>
                                        <h3 className="text-xl font-bold group-hover:text-cyan-400 transition-colors">{comp.artifactId}</h3>
                                    </div>
                                    <StatusBadge status={comp.status} />
                                </div>
                                <div className="flex justify-end items-center text-sm w-full">
                                    <ChevronRight className="text-neutral-700 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" size={20} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileCode className="text-cyan-500" size={24} />
                        Widespread Redundancy
                    </h2>
                </div>
                <p className="text-neutral-400">Files present in the highest number of component releases across all indexed artifacts.</p>

                <TopFilesList />
            </section>
        </div>
    )
}

function TopFilesList() {
    const { data: topFiles, isLoading } = useQuery({
        queryKey: ['top-files'],
        queryFn: fetchTopFiles,
    })

    if (isLoading) return <div className="h-48 flex items-center justify-center text-cyan-500"><Clock className="animate-spin mr-2" /> Loading top files...</div>

    if (!topFiles || topFiles.length === 0) {
        return (
            <div className="glass-panel p-12 text-center text-neutral-500">
                No files indexed yet. Once component releases are analyzed, the most widespread files will appear here.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topFiles.map(file => (
                <Link
                    key={file.id}
                    to={`/files/${encodeURIComponent(file.fqn)}`}
                    className="glass-panel p-4 hover:bg-neutral-900 transition-all group flex items-center justify-between border-l-4 border-l-cyan-500/30 hover:border-l-cyan-500"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-neutral-300 group-hover:text-cyan-400 truncate">{formatFqn(file.fqn)}</p>
                    </div>
                    <ChevronRight size={20} className="text-neutral-700 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </Link>
            ))}
        </div>
    )
}

function LifetimeChart({ data }) {
    if (!data || data.length === 0) return null

    const [hoverIndex, setHoverIndex] = useState(null)
    const svgRef = useRef(null)

    const margin = { top: 20, right: 30, bottom: 30, left: 50 }
    const width = 1200
    const height = 180
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const maxValue = Math.max(...data.map(d => Math.max(d.addedCount, d.removedCount, d.modifiedCount, d.totalCount))) || 1

    // Total classes line will be thin neutral, others colored
    const xScale = (i) => (i / (data.length - 1 || 1)) * innerWidth
    const yScale = (v) => innerHeight - (v / maxValue) * innerHeight

    const createPath = (key) => {
        return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d[key])}`).join(' ')
    }

    const handleMouseMove = (e) => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const CTM = svg.getScreenCTM()
        const x = (e.clientX - CTM.e) / CTM.a - margin.left

        if (x < -20 || x > innerWidth + 20) {
            setHoverIndex(null)
            return
        }

        const step = innerWidth / (data.length - 1 || 1)
        const index = Math.round(Math.max(0, Math.min(innerWidth, x)) / step)
        if (index >= 0 && index < data.length) {
            setHoverIndex(index)
        } else {
            setHoverIndex(null)
        }
    }

    const hoveredData = hoverIndex !== null ? data[hoverIndex] : null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-4 overflow-hidden border-cyan-500/10"
        >
            <div className="relative w-full" onMouseLeave={() => setHoverIndex(null)}>
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible cursor-crosshair"
                    onMouseMove={handleMouseMove}
                >
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(v => (
                            <line
                                key={v}
                                x1={0} y1={innerHeight * v} x2={innerWidth} y2={innerHeight * v}
                                className="stroke-white opacity-[0.1]" strokeWidth="1"
                            />
                        ))}

                        {/* Total Files Line */}
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                            d={createPath('totalCount')}
                            fill="none"
                            stroke="rgba(163, 163, 163, 0.3)"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                        />

                        {/* Added Files Line */}
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
                            d={createPath('addedCount')}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Modified Files Line */}
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.4, ease: "easeInOut" }}
                            d={createPath('modifiedCount')}
                            fill="none"
                            stroke="#eab308"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Removed Files Line */}
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 0.6, ease: "easeInOut" }}
                            d={createPath('removedCount')}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Points and Tooltips */}
                        {data.map((d, i) => (
                            <g key={i}>
                                <circle
                                    cx={xScale(i)}
                                    cy={yScale(d.totalCount)}
                                    r="3"
                                    className="fill-neutral-500 hover:fill-neutral-300 transition-colors cursor-pointer"
                                >
                                    <title>{d.version}: {d.totalCount} total classes</title>
                                </circle>
                                {data.length < 30 && (
                                    <text
                                        x={xScale(i)}
                                        y={innerHeight + 20}
                                        textAnchor="middle"
                                        className="fill-neutral-600 text-[8px] font-mono"
                                    >
                                        {d.version.length > 8 ? d.version.substring(0, 6) + '..' : d.version}
                                    </text>
                                )}
                            </g>
                        ))}

                        {/* Vertical Hover Line */}
                        {hoverIndex !== null && (
                            <line
                                x1={xScale(hoverIndex)}
                                y1={0}
                                x2={xScale(hoverIndex)}
                                y2={innerHeight}
                                className="stroke-cyan-500/50"
                                strokeWidth="1"
                                strokeDasharray="4 2"
                            />
                        )}

                        {/* Tooltip */}
                        <AnimatePresence>
                            {hoverIndex !== null && hoveredData && (
                                <motion.g
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.1 }}
                                    transform={`translate(${xScale(hoverIndex) + (hoverIndex > data.length / 2 ? -220 : 20)}, 0)`}
                                >
                                    <rect
                                        width="200"
                                        height="120"
                                        rx="12"
                                        className="fill-neutral-900/95 stroke-cyan-500/40 backdrop-blur-xl shadow-2xl"
                                    />
                                    <text x="15" y="30" className="fill-white font-black text-[14px]">{hoveredData.version}</text>

                                    <g transform="translate(15, 55)">
                                        <circle r="4" className="fill-green-500" />
                                        <text x="12" y="4" className="fill-neutral-300 text-[12px]">Added: <tspan className="fill-green-400 font-bold">{hoveredData.addedCount}</tspan></text>
                                    </g>

                                    <g transform="translate(15, 75)">
                                        <circle r="4" className="fill-yellow-500" />
                                        <text x="12" y="4" className="fill-neutral-300 text-[12px]">Modified: <tspan className="fill-yellow-400 font-bold">{hoveredData.modifiedCount}</tspan></text>
                                    </g>

                                    <g transform="translate(15, 95)">
                                        <circle r="4" className="fill-red-500" />
                                        <text x="12" y="4" className="fill-neutral-300 text-[12px]">Removed: <tspan className="fill-red-400 font-bold">{hoveredData.removedCount}</tspan></text>
                                    </g>

                                    <line x1="15" y1="105" x2="185" y2="105" className="stroke-neutral-800" strokeWidth="1" />
                                    <text x="15" y="114" className="fill-neutral-500 text-[10px] font-mono uppercase tracking-tighter">Total Files: {hoveredData.totalCount}</text>
                                </motion.g>
                            )}
                        </AnimatePresence>
                    </g>
                </svg>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-[8px] uppercase tracking-widest font-bold opacity-60">
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Files Added</div>
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Files Modified</div>
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Files Removed</div>
            </div>
        </motion.div>
    )
}

function ComponentPage() {
    const { groupId, artifactId } = useParams()
    const [searchParams] = useSearchParams()
    const [selectedVersion, setSelectedVersion] = useState(searchParams.get('version') || null)
    const [baselineVersion, setBaselineVersion] = useState(null)
    const [historyData, setHistoryData] = useState(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [codeOnly, setCodeOnly] = useState(true)

    const handleGenerateHistory = async () => {
        setLoadingHistory(true)
        try {
            const data = await fetchComponentHistory(groupId, artifactId, codeOnly)
            setHistoryData(data)
        } catch (err) {
            console.error("Failed to load history:", err)
        } finally {
            setLoadingHistory(false)
        }
    }

    const { data: component, isLoading: compLoading, error: compError } = useQuery({
        queryKey: ['component', groupId, artifactId],
        queryFn: () => fetchComponentRedundancy(groupId, artifactId),
        refetchInterval: (query) => {
            const data = query.state.data
            if (!data) return false
            if (!data.releases) return 3000           // API returned PENDING string — not a component yet
            if (data.status === 'PENDING') return 3000
            if (data.releases?.some(r => r.status === 'PENDING')) return 5000
            return false
        },
    })

    const { data: diff, isLoading: diffLoading } = useQuery({
        queryKey: ['diff', groupId, artifactId, selectedVersion, baselineVersion, codeOnly],
        queryFn: () => fetchReleaseDiff(groupId, artifactId, selectedVersion, baselineVersion, codeOnly),
        enabled: !!selectedVersion,
    })

    if (compLoading) return <div className="text-center py-24"><Clock className="animate-spin mx-auto mb-4 text-cyan-500" size={48} /> Loading component data...</div>

    if (compError || !component) return (
        <div className="glass-panel p-8 text-center text-red-500 max-w-lg mx-auto">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">Component Not Found</h2>
            <p className="text-neutral-400 mb-6">We couldn't find {groupId}:{artifactId}. It might still be processing or the coordinates are incorrect.</p>
            <Link to="/" className="text-cyan-500 hover:underline">Return Home</Link>
        </div>
    )

    // API returned a 202 string — component exists but releases haven't been discovered yet
    if (!component.releases) return (
        <div className="flex flex-col items-center gap-6 py-24 text-center">
            <Loader2 className="animate-spin text-cyan-500" size={56} />
            <div className="space-y-2">
                <p className="text-cyan-500 font-mono text-sm">{groupId}</p>
                <h1 className="text-3xl font-extrabold">{artifactId}</h1>
            </div>
            <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-5 py-3 text-sm">
                <Loader2 className="animate-spin flex-shrink-0" size={15} />
                Currently being indexed &mdash; discovering releases, please wait&hellip;
            </div>
            <p className="text-neutral-500 text-sm">This page will update automatically.</p>
        </div>
    )

    const hasPendingReleases = component.releases?.some(r => r.status !== 'READY')
    const selectedRelease = component.releases?.find(r => r.version === selectedVersion)
    const selectedIsReady = selectedRelease?.status === 'READY'

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pb-8 border-b border-neutral-800">
                <div className="space-y-4 flex-0" style={{ minWidth: "300px" }}>
                    <div className="space-y-1">
                        <p className="text-cyan-500 font-mono text-xs">{groupId}</p>
                        <h1 className="text-4xl font-black tracking-tight">{artifactId}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={component.status} />
                        {!historyData && !loadingHistory ? (
                            <button
                                onClick={handleGenerateHistory}
                                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-cyan-400 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border border-cyan-500/20 hover:border-cyan-500/50"
                            >
                                <BarChart3 size={12} /> Generate Lifetime Overview
                            </button>
                        ) : loadingHistory ? (
                            <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-bold px-3 py-1.5">
                                <Loader2 className="animate-spin text-cyan-500" size={12} /> Analyzing history...
                            </div>
                        ) : null}
                    </div>
                </div>

                {historyData && !loadingHistory && (
                    <div className="space-y-4 flex-1">
                        <LifetimeChart data={historyData} />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between glass-panel p-4">
                <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold text-neutral-400">View Mode:</span>
                    <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                        <button
                            onClick={() => { setCodeOnly(true); setHistoryData(null); }}
                            className={`px-4 py-1.5 rounded-md transition-all font-bold ${codeOnly ? 'bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Code Only
                        </button>
                        <button
                            onClick={() => { setCodeOnly(false); setHistoryData(null); }}
                            className={`px-4 py-1.5 rounded-md transition-all font-bold ${!codeOnly ? 'bg-fuchsia-500 text-neutral-950 shadow-lg shadow-fuchsia-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            All Files
                        </button>
                    </div>
                </div>
                {hasPendingReleases && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                        <Loader2 size={10} className="animate-spin" /> Some releases indexing...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 opacity-80">
                        <Clock className="text-cyan-500" size={18} /> Releases
                    </h2>
                    <div className="glass-panel overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto divide-y divide-neutral-800 custom-scrollbar">
                            {[...(component.releases ?? [])].sort((a, b) => (a.status === 'READY' ? -1 : 1) - (b.status === 'READY' ? -1 : 1)).map((rel) => {
                                const isReady = rel.status === 'READY'
                                const isSelected = selectedVersion === rel.version
                                return (
                                    <button
                                        key={rel.version}
                                        onClick={() => {
                                            setSelectedVersion(rel.version)
                                            setBaselineVersion(null)
                                        }}
                                        className={`w-full text-left p-4 transition-colors flex items-center justify-between group ${isSelected
                                            ? isReady
                                                ? 'bg-cyan-500/10 border-r-2 border-cyan-500'
                                                : 'bg-amber-500/5 border-r-2 border-amber-500/50'
                                            : 'hover:bg-neutral-900'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`font-mono text-sm transition-colors ${isReady
                                                ? 'font-bold group-hover:text-cyan-400'
                                                : 'line-through text-neutral-500'
                                                }`}>
                                                {rel.version}
                                            </span>
                                            {!isReady && (
                                                <span className="text-xs text-amber-500/70">{rel.status}</span>
                                            )}
                                        </div>
                                        {isReady
                                            ? <ChevronRight size={16} className={`text-neutral-600 group-hover:text-cyan-500 transition-all ${isSelected ? 'translate-x-1' : ''}`} />
                                            : <Clock size={14} className="text-amber-500/50 flex-shrink-0" />
                                        }
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    <h2 className="text-xl font-bold flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <FileCode className="text-cyan-500" size={20} /> Release Investigation
                        </div>
                        {selectedVersion && selectedIsReady && (
                            <div className="flex items-center gap-2 text-xs font-normal">
                                <span className="text-neutral-500">Compare against:</span>
                                <select
                                    value={baselineVersion || diff?.previousVersion || ''}
                                    onChange={(e) => setBaselineVersion(e.target.value)}
                                    className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 focus:outline-none focus:ring-1 ring-cyan-500/50"
                                >
                                    <option value="">(Auto-detect)</option>
                                    {(component.releases || [])
                                        .filter(r => r.status === 'READY' && r.version !== selectedVersion)
                                        .map(r => (
                                            <option key={r.version} value={r.version}>{r.version}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}
                    </h2>

                    {!selectedVersion ? (
                        <div className="glass-panel p-24 text-center text-neutral-500 flex flex-col items-center gap-4">
                            <p>Select a version from the left to investigate changes and redundancy.</p>
                        </div>
                    ) : !selectedIsReady ? (
                        <div className={`glass-panel p-16 flex flex-col items-center gap-5 text-center border ${selectedRelease?.status === 'NOT_FOUND' ? 'border-red-500/20' : 'border-amber-500/20'}`}>
                            {selectedRelease?.status === 'NOT_FOUND' ? (
                                <>
                                    <FileX className="text-red-500" size={48} />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">No JAR Associated</h3>
                                        <p className="text-neutral-400 text-sm max-w-xs">
                                            Release <span className="font-mono text-neutral-300">{selectedVersion}</span> has no JAR file associated on Maven Central.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="animate-spin text-amber-400" size={40} />
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Not yet available</h3>
                                        <p className="text-neutral-400 text-sm max-w-xs">
                                            Release <span className="font-mono text-neutral-300">{selectedVersion}</span> is currently being indexed.
                                            Check back shortly once indexing is complete.
                                        </p>
                                    </div>
                                </>
                            )}
                            <StatusBadge status={selectedRelease?.status} />
                        </div>
                    ) : diffLoading ? (
                        <div className="glass-panel p-24 text-center text-cyan-500">
                            <Clock className="animate-spin mx-auto mb-4" size={32} />
                            Calculating diff...
                        </div>
                    ) : diff ? (
                        diff.totalClasses === 0 ? (
                            <div className="glass-panel p-24 text-center text-neutral-500 flex flex-col items-center gap-4">
                                <FileX className="text-neutral-600" size={48} />
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">Empty Release</h3>
                                    <p className="text-neutral-400 text-sm max-w-xs">
                                        This release contains no {codeOnly ? 'code' : ''} files to analyze.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <MetricCard
                                        label={codeOnly ? "Total Code Files" : "Total Files"}
                                        value={diff.totalClasses || 0}
                                        color="text-cyan-500"
                                        subValue={formatBytes(diff.totalSizeBytes)}
                                    />
                                    <MetricCard
                                        label="Added"
                                        value={diff.added?.length || 0}
                                        color="text-green-500"
                                        quota={diff.totalSizeBytes > 0 ? (diff.addedSizeBytes / diff.totalSizeBytes * 100).toFixed(1) : 0}
                                        quotaLabel="Addition Quota"
                                        subValue={formatBytes(diff.addedSizeBytes)}
                                    />
                                    <MetricCard
                                        label="Modified"
                                        value={diff.modified?.length || 0}
                                        color="text-yellow-500"
                                        quota={diff.totalSizeBytes > 0 ? (diff.modifiedSizeBytes / diff.totalSizeBytes * 100).toFixed(1) : 0}
                                        quotaLabel="Modification Quota"
                                        subValue={formatBytes(diff.modifiedSizeBytes)}
                                    />
                                    <MetricCard
                                        label="Unmodified"
                                        value={(diff.totalClasses || 0) - (diff.added?.length || 0) - (diff.modified?.length || 0)}
                                        color="text-neutral-300"
                                        quota={diff.totalSizeBytes > 0 ? ((diff.totalSizeBytes - diff.addedSizeBytes - diff.modifiedSizeBytes) / diff.totalSizeBytes * 100).toFixed(1) : 0}
                                        quotaLabel="Unmodified Quota"
                                        subValue={formatBytes(diff.totalSizeBytes - diff.addedSizeBytes - diff.modifiedSizeBytes)}
                                    />
                                    <MetricCard
                                        label="Removed"
                                        value={diff.removed?.length || 0}
                                        color="text-red-500"
                                        subValue={formatBytes(diff.removedSizeBytes)}
                                    />
                                </div>

                                <QuotaBar diff={diff} />

                                <div className="glass-panel p-6 space-y-6">
                                    <DiffSection title="Added" files={diff.added} color="bg-green-500" />
                                    <DiffSection title="Modified" files={diff.modified} color="bg-yellow-500" />
                                    <DiffSection title="Removed" files={diff.removed} color="bg-red-500" />
                                </div>
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    )
}

function DiffSection({ title, files, color }) {
    return (
        <div className="pt-6 first:pt-0 border-t first:border-t-0 border-neutral-800">
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`} /> {title}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {files?.map(file => (
                    <Link
                        key={file.id}
                        to={`/file/${file.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-neutral-800/50 group transition-colors border border-transparent hover:border-neutral-800"
                    >
                        <span className="text-sm font-mono text-neutral-300 group-hover:text-cyan-400 truncate flex-1">{formatFqn(file.fqn)}</span>
                        <ChevronRight size={14} className="text-neutral-700 ml-2" />
                    </Link>
                ))}
                {files?.length === 0 && <p className="text-neutral-600 text-sm italic">No changes.</p>}
            </div>
        </div>
    )
}

function MetricCard({ label, value, color, quota, quotaLabel, subValue, icon: Icon }) {
    return (
        <div className="glass-panel p-5 relative overflow-hidden group transition-all hover:bg-neutral-900/50">
            {Icon && (
                <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                    <Icon size={84} strokeWidth={1} />
                </div>
            )}
            <div className="relative flex flex-col gap-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
                    {Icon && <Icon className={color} size={14} opacity={0.5} />}
                </div>
                <p className={`text-3xl font-bold ${color}`}>{formatNumber(value)}</p>
                {subValue && (
                    <p className="text-[10px] text-neutral-400 mt-1 font-mono">{subValue}</p>
                )}
                {quota !== undefined && (
                    <div className="mt-3 pt-3 border-t border-neutral-800/50">
                        <p className="text-neutral-500 text-[9px] uppercase tracking-tight mb-0.5">{quotaLabel}</p>
                        <p className="text-sm font-mono text-neutral-300">{quota}%</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function QuotaBar({ diff }) {
    if (!diff || !diff.totalSizeBytes) return null;

    const addedPct = (diff.addedSizeBytes / diff.totalSizeBytes) * 100;
    const modifiedPct = (diff.modifiedSizeBytes / diff.totalSizeBytes) * 100;
    const unmodifiedPct = 100 - addedPct - modifiedPct;

    return (
        <div className="w-full h-8 flex rounded-md overflow-hidden bg-neutral-900 border border-neutral-800 shadow-inner">
            <div
                className="h-full bg-green-500 transition-all duration-500 relative group"
                style={{ width: `${addedPct}%` }}
                title={`Added: ${addedPct.toFixed(1)}%`}
            >
                {addedPct > 10 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-950 uppercase">Added</span>}
            </div>
            <div
                className="h-full bg-yellow-500 transition-all duration-500 relative group"
                style={{ width: `${modifiedPct}%` }}
                title={`Modified: ${modifiedPct.toFixed(1)}%`}
            >
                {modifiedPct > 10 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-950 uppercase">Modified</span>}
            </div>
            <div
                className="h-full bg-neutral-400 transition-all duration-500 relative group"
                style={{ width: `${unmodifiedPct}%` }}
                title={`Unmodified: ${unmodifiedPct.toFixed(1)}%`}
            >
                {unmodifiedPct > 10 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-neutral-950 uppercase">Same</span>}
            </div>
        </div>
    );
}

function FileRevisionsPage() {
    const { fqn } = useParams()
    const decodedFqn = decodeURIComponent(fqn)
    const [page, setPage] = useState(0)
    const [sortField, setSortField] = useState('releaseCount')
    const [sortDir, setSortDir] = useState('desc')

    const sortString = `${sortField},${sortDir}`

    const { data: revisionsData, isLoading } = useQuery({
        queryKey: ['file-revisions', decodedFqn, page, sortString],
        queryFn: () => fetchFileRevisions(decodedFqn, page, 30, sortString),
    })

    if (isLoading) return <div className="text-center py-24"><Clock className="animate-spin mx-auto text-cyan-500" size={48} /></div>

    if (!revisionsData) return (
        <div className="glass-panel p-8 text-center text-red-500 max-w-lg mx-auto mt-8">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">Revisions Not Found</h2>
            <p className="text-neutral-400 mb-6">Could not load revisions for {decodedFqn}.</p>
        </div>
    )

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('desc')
        }
        setPage(0)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="glass-panel p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="relative flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-cyan-500 mb-2">
                            <FileCode size={24} />
                            <span className="font-bold uppercase tracking-widest text-sm">File Revisions Investigation</span>
                        </div>
                        <h1 className="text-2xl font-bold break-all font-mono mb-2 md:mb-0">
                            {formatFqn(decodedFqn)}
                        </h1>
                    </div>

                    <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 text-center md:w-48 flex-shrink-0">
                        <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Revisions</p>
                        <p className="font-mono text-3xl font-bold text-cyan-500">{revisionsData?.page?.totalElements || revisionsData?.totalElements || 0}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="text-cyan-500" size={20} />
                            Revision History
                        </h2>
                        <p className="text-neutral-400">All physically distinct versions of this file across the ecosystem.</p>
                    </div>
                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                        <button
                            onClick={() => toggleSort('releaseCount')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${sortField === 'releaseCount' ? 'bg-cyan-600' : 'hover:bg-neutral-800'}`}
                        >
                            Most Used {sortField === 'releaseCount' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                            onClick={() => toggleSort('sizeBytes')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${sortField === 'sizeBytes' ? 'bg-cyan-600' : 'hover:bg-neutral-800'}`}
                        >
                            Size {sortField === 'sizeBytes' && (sortDir === 'asc' ? '↑' : '↓')}
                        </button>
                    </div>
                </div>

                <div className="glass-panel overflow-hidden">
                    <div className="divide-y divide-neutral-800">
                        {revisionsData.content.map(file => (
                            <Link
                                key={file.id}
                                to={`/file/${file.id}`}
                                className="p-4 hover:bg-neutral-900 transition-all group flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                            >
                                <div className="space-y-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-neutral-300 group-hover:text-cyan-400 truncate break-all">{file.sha512}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0 text-right sm:text-left">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Size</p>
                                        <p className="font-mono text-sm">{formatBytes(file.sizeBytes)}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Uses</p>
                                        <p className="font-mono text-sm font-bold">{file.releaseCount}</p>
                                    </div>
                                    <ChevronRight size={20} className="text-neutral-700 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        ))}
                        {revisionsData.content.length === 0 && (
                            <div className="text-center text-neutral-500 p-8">No revisions found.</div>
                        )}
                    </div>
                </div>

                {(revisionsData?.page?.totalPages || revisionsData?.totalPages) > 0 && (
                    <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={revisionsData.first ?? (revisionsData?.page?.number === 0)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${(revisionsData.first ?? (revisionsData?.page?.number === 0)) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
                                }`}
                        >
                            Previous
                        </button>
                        <span className="text-neutral-400 font-mono text-sm">
                            Page {(revisionsData?.page?.number ?? revisionsData.number) + 1} of {revisionsData?.page?.totalPages ?? revisionsData.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={revisionsData.last ?? (revisionsData?.page?.number + 1 >= (revisionsData?.page?.totalPages ?? revisionsData.totalPages))}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${(revisionsData.last ?? (revisionsData?.page?.number + 1 >= (revisionsData?.page?.totalPages ?? revisionsData.totalPages))) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
                                }`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function FileRevisionDetailsPage() {
    const { id } = useParams()
    const [page, setPage] = useState(0)

    const { data: fileRevision, isLoading: detailsLoading } = useQuery({
        queryKey: ['file-details', id],
        queryFn: () => fetchFileDetails(id),
    })

    const { data: releasesData, isLoading: releasesLoading } = useQuery({
        queryKey: ['file-releases', id, page],
        queryFn: () => fetchReleasesForFile(id, page, 10),
        enabled: !!id
    })

    if (detailsLoading || releasesLoading) return <div className="text-center py-24"><Clock className="animate-spin mx-auto text-cyan-500" size={48} /></div>

    if (!fileRevision) return (
        <div className="glass-panel p-8 text-center text-red-500 max-w-lg mx-auto mt-8">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">File Revision Not Found</h2>
            <p className="text-neutral-400 mb-6">Could not load the details for the specified file revision.</p>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="glass-panel p-8 space-y-6">
                <div className="relative">
                    <div className="flex items-center gap-3 text-cyan-500 mb-2">
                        <FileCode size={24} />
                        <span className="font-bold uppercase tracking-widest text-sm">File Revision Investigation</span>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <h1 className="text-2xl font-bold break-all font-mono">
                            {formatFqn(fileRevision.fqn)}
                        </h1>
                        <Link
                            to={`/files/${encodeURIComponent(fileRevision.fqn)}`}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
                        >
                            All Revisions <ChevronRight size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
                            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">File Size</p>
                            <p className="font-mono text-lg">{formatBytes(fileRevision.sizeBytes)}</p>
                        </div>
                        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
                            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Releases</p>
                            <p className="font-mono text-lg">{fileRevision.releaseCount}</p>
                        </div>
                        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 md:col-span-3">
                            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">SHA-512 Hash</p>
                            <p className="font-mono text-sm break-all text-neutral-300">{fileRevision.sha512}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="text-cyan-500" size={20} />
                    Widespread Redundancy
                </h2>
                <p className="text-neutral-400">This specific binary version of the file appears in the following releases:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {releasesData?.content?.map(rel => (
                        <Link
                            key={`${rel.component.groupId}:${rel.component.artifactId}:${rel.version}`}
                            to={`/component/${rel.component.groupId}/${rel.component.artifactId}?version=${encodeURIComponent(rel.version)}`}
                            className="glass-panel p-4 hover:bg-neutral-900 transition-all group flex items-center justify-between"
                        >
                            <div>
                                <p className="text-[10px] text-neutral-500 font-mono">{rel.component.groupId}</p>
                                <p className="font-bold group-hover:text-cyan-400 transition-colors">
                                    {rel.component.artifactId} <span className="text-neutral-400 ml-1">{rel.version}</span>
                                </p>
                            </div>
                            <ChevronRight size={20} className="text-neutral-700 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                    {releasesData?.content?.length === 0 && (
                        <div className="col-span-full text-center text-neutral-500 py-8">No releases found.</div>
                    )}
                </div>

                {(releasesData?.page?.totalPages || releasesData?.totalPages) > 0 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={releasesData.first ?? (releasesData?.page?.number === 0)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${(releasesData.first ?? (releasesData?.page?.number === 0)) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
                                }`}
                        >
                            Previous
                        </button>
                        <span className="text-neutral-400 font-mono text-sm">
                            Page {(releasesData?.page?.number ?? releasesData.number) + 1} of {releasesData?.page?.totalPages ?? releasesData.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={releasesData.last ?? (releasesData?.page?.number + 1 >= (releasesData?.page?.totalPages ?? releasesData.totalPages))}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${(releasesData.last ?? (releasesData?.page?.number + 1 >= (releasesData?.page?.totalPages ?? releasesData.totalPages))) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
                                }`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App



