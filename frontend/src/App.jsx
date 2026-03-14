import { useState } from 'react'
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Search, Home, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight, FileCode, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchComponents, fetchComponentRedundancy, fetchReleaseDiff, fetchReleasesForClass, fetchTopClasses, fetchClassDetails, fetchClassRevisions } from './api'

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

function FqnSearchBar() {
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const navigate = useNavigate()

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!input.trim()) return

        let fqn = input.trim()
        if (!fqn.endsWith('.class')) {
            fqn += '.class'
        }

        setLoading(true)
        try {
            const data = await fetchClassRevisions(fqn, 0, 1)
            const count = data?.page?.totalElements ?? data?.totalElements ?? 0
            if (count > 0) {
                navigate(`/class/fqn/${encodeURIComponent(fqn)}`)
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
                    placeholder="Quick find FQN..."
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
                    <Route path="/class/:id" element={<ClassPage />} />
                    <Route path="/class/fqn/:fqn" element={<ClassFqnPage />} />
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
    const navigate = useNavigate()

    const { data, isLoading, error } = useQuery({
        queryKey: ['components'],
        queryFn: () => fetchComponents(['PENDING', 'READY']),
        refetchInterval: 5000,
    })

    const handleSearch = (e) => {
        e.preventDefault()
        if (!search.includes(':')) return
        const [groupId, artifactId] = search.split(':')
        navigate(`/component/${groupId}/${artifactId}`)
    }

    return (
        <div className="space-y-12">
            <section className="text-center space-y-4 max-w-2xl mx-auto py-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-500/20 blur-[100px] rounded-full pointer-events-none" />
                <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-cyan-400 to-fuchsia-500 pb-2">
                    Investigate Redundancy
                </h1>
                <p className="text-neutral-400 text-lg">Analyze component releases to identify added, removed, and modified classes across the ecosystem.</p>
                <form onSubmit={handleSearch} className="flex bg-neutral-900 border border-neutral-800 rounded-full p-2 pl-6 focus-within:ring-2 ring-fuchsia-500/100 transition-all shadow-xl shadow-fuchsia-500/10">
                    <input
                        type="text"
                        placeholder="Search groupId:artifactId..."
                        className="flex-1 bg-transparent border-none outline-none py-2"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 px-8 py-2 rounded-full font-semibold transition-colors">
                        Analyze
                    </button>
                </form>
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
                                    <ChevronRight className="text-neutral-700 group-hover:text-cyan-500 group-hover:tranneutral-x-1 transition-all" size={20} />
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
                <p className="text-neutral-400">Class files present in the highest number of component releases across all indexed artifacts.</p>

                <TopClassesList />
            </section>
        </div>
    )
}

function TopClassesList() {
    const { data: topClasses, isLoading } = useQuery({
        queryKey: ['top-classes'],
        queryFn: fetchTopClasses,
    })

    if (isLoading) return <div className="h-48 flex items-center justify-center text-cyan-500"><Clock className="animate-spin mr-2" /> Loading top classes...</div>

    if (!topClasses || topClasses.length === 0) {
        return (
            <div className="glass-panel p-12 text-center text-neutral-500">
                No class files indexed yet. Once component releases are analyzed, the most widespread classes will appear here.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topClasses.map(cf => (
                <Link
                    key={cf.id}
                    to={`/class/fqn/${encodeURIComponent(cf.fqn)}`}
                    className="glass-panel p-4 hover:bg-neutral-900 transition-all group flex items-center justify-between border-l-4 border-l-cyan-500/30 hover:border-l-cyan-500"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-neutral-300 group-hover:text-cyan-400 truncate">{formatFqn(cf.fqn)}</p>
                    </div>
                    <ChevronRight size={20} className="text-neutral-700 group-hover:text-cyan-500 group-hover:tranneutral-x-1 transition-all flex-shrink-0 ml-4" />
                </Link>
            ))}
        </div>
    )
}

function ComponentPage() {
    const { groupId, artifactId } = useParams()
    const [searchParams] = useSearchParams()
    const [selectedVersion, setSelectedVersion] = useState(searchParams.get('version') || null)

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
        queryKey: ['diff', groupId, artifactId, selectedVersion],
        queryFn: () => fetchReleaseDiff(groupId, artifactId, selectedVersion),
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
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                    <p className="text-cyan-500 font-mono text-sm">{groupId}</p>
                    <h1 className="text-4xl font-extrabold">{artifactId}</h1>
                    <div className="flex items-center gap-4 text-neutral-400">
                        <StatusBadge status={component.status} />
                    </div>
                    {hasPendingReleases && (
                        <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-4 py-2 text-sm mt-2">
                            <Loader2 className="animate-spin flex-shrink-0" size={15} />
                            Currently being indexed &mdash; some releases may not yet be available
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="text-cyan-500" size={20} /> Releases
                    </h2>
                    <div className="glass-panel overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto divide-y divide-neutral-800">
                            {[...(component.releases ?? [])].sort((a, b) => (a.status === 'READY' ? -1 : 1) - (b.status === 'READY' ? -1 : 1)).map((rel) => {
                                const isReady = rel.status === 'READY'
                                const isSelected = selectedVersion === rel.version
                                return (
                                    <button
                                        key={rel.version}
                                        onClick={() => setSelectedVersion(rel.version)}
                                        className={`w-full text-left p-4 transition-colors flex items-center justify-between group ${
                                            isSelected
                                                ? isReady
                                                    ? 'bg-cyan-500/10 border-r-2 border-cyan-500'
                                                    : 'bg-amber-500/5 border-r-2 border-amber-500/50'
                                                : 'hover:bg-neutral-900'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`font-mono text-sm transition-colors ${
                                                isReady
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
                                            ? <ChevronRight size={16} className={`text-neutral-600 group-hover:text-cyan-500 transition-all ${isSelected ? 'tranneutral-x-1' : ''}`} />
                                            : <Clock size={14} className="text-amber-500/50 flex-shrink-0" />
                                        }
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileCode className="text-cyan-500" size={20} /> Release Investigation
                        {diff?.previousVersion && (
                            <span className="text-sm font-normal text-neutral-500 ml-2">
                                (Compared against <span className="font-mono text-neutral-400">{diff.previousVersion}</span>)
                            </span>
                        )}
                    </h2>

                    {!selectedVersion ? (
                        <div className="glass-panel p-24 text-center text-neutral-500 flex flex-col items-center gap-4">
                            <p>Select a version from the left to investigate changes and redundancy.</p>
                        </div>
                    ) : !selectedIsReady ? (
                        <div className="glass-panel p-16 flex flex-col items-center gap-5 text-center border border-amber-500/20">
                            <Loader2 className="animate-spin text-amber-400" size={40} />
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Not yet available</h3>
                                <p className="text-neutral-400 text-sm max-w-xs">
                                    Release <span className="font-mono text-neutral-300">{selectedVersion}</span> is currently being indexed.
                                    Check back shortly once indexing is complete.
                                </p>
                            </div>
                            <StatusBadge status={selectedRelease?.status} />
                        </div>
                    ) : diffLoading ? (
                        <div className="glass-panel p-24 text-center text-cyan-500">
                            <Clock className="animate-spin mx-auto mb-4" size={32} />
                            Calculating diff...
                        </div>
                    ) : diff ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <MetricCard 
                                    label="Total Classes" 
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
                                <DiffSection title="Added Classes" classes={diff.added} color="bg-green-500" />
                                <DiffSection title="Modified Classes" classes={diff.modified} color="bg-yellow-500" />
                                <DiffSection title="Removed Classes" classes={diff.removed} color="bg-red-500" />
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

function DiffSection({ title, classes, color }) {
    return (
        <div className="pt-6 first:pt-0 border-t first:border-t-0 border-neutral-800">
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`} /> {title}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {classes?.map(cf => (
                    <Link
                        key={cf.id}
                        to={`/class/fqn/${encodeURIComponent(cf.fqn)}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-neutral-800/50 group transition-colors border border-transparent hover:border-neutral-800"
                    >
                        <span className="text-sm font-mono text-neutral-300 group-hover:text-cyan-400 truncate flex-1">{formatFqn(cf.fqn)}</span>
                        <ChevronRight size={14} className="text-neutral-700 ml-2" />
                    </Link>
                ))}
                {classes?.length === 0 && <p className="text-neutral-600 text-sm italic">No classes.</p>}
            </div>
        </div>
    )
}

function MetricCard({ label, value, color, quota, quotaLabel, subValue }) {
    return (
        <div className="glass-panel p-4 text-center group">
            <p className="text-neutral-500 text-[10px] uppercase tracking-wider font-semibold mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
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

function ClassPage() {
    const { id } = useParams()
    const [page, setPage] = useState(0)

    const { data: classDetails, isLoading: detailsLoading } = useQuery({
        queryKey: ['class-details', id],
        queryFn: () => fetchClassDetails(id),
    })

    const { data: releasesData, isLoading: releasesLoading } = useQuery({
        queryKey: ['class-releases', id, page],
        queryFn: () => fetchReleasesForClass(id, page, 10),
    })

    if (detailsLoading || releasesLoading) return <div className="text-center py-24"><Clock className="animate-spin mx-auto text-cyan-500" size={48} /></div>

    if (!classDetails) return (
        <div className="glass-panel p-8 text-center text-red-500 max-w-lg mx-auto mt-8">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">Class Not Found</h2>
            <p className="text-neutral-400 mb-6">Could not load the details for class ID {id}.</p>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="glass-panel p-8 space-y-6">
                <div className="relative">
                    <div className="flex items-center gap-3 text-cyan-500 mb-2">
                        <FileCode size={24} />
                        <span className="font-bold uppercase tracking-widest text-sm">Class Investigation</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <h1 className="text-2xl font-bold break-all font-mono">
                            {formatFqn(classDetails.fqn)}
                        </h1>
                        <Link 
                            to={`/class/fqn/${encodeURIComponent(classDetails.fqn)}`}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
                        >
                            All Revisions <ChevronRight size={16} />
                        </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
                            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">File Size</p>
                            <p className="font-mono text-lg">{formatBytes(classDetails.sizeBytes)}</p>
                        </div>
                        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
                            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">Total Releases</p>
                            <p className="font-mono text-lg">{classDetails.releaseCount}</p>
                        </div>
                        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 md:col-span-3">
                            <p className="text-neutral-500 text-xs uppercase tracking-wider font-semibold mb-1">SHA-512 Hash</p>
                            <p className="font-mono text-sm break-all text-neutral-300">{classDetails.sha512}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="text-cyan-500" size={20} />
                    Widespread Redundancy
                </h2>
                <p className="text-neutral-400">This specific binary version of the class appears in the following releases:</p>

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
                            <ChevronRight size={20} className="text-neutral-700 group-hover:text-cyan-500 group-hover:tranneutral-x-1 transition-all" />
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
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                (releasesData.first ?? (releasesData?.page?.number === 0)) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
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
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                (releasesData.last ?? (releasesData?.page?.number + 1 >= (releasesData?.page?.totalPages ?? releasesData.totalPages))) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
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

function ClassFqnPage() {
    const { fqn } = useParams()
    const decodedFqn = decodeURIComponent(fqn)
    const [page, setPage] = useState(0)
    const [sortField, setSortField] = useState('releaseCount')
    const [sortDir, setSortDir] = useState('desc')

    const sortString = `${sortField},${sortDir}`

    const { data: revisionsData, isLoading } = useQuery({
        queryKey: ['class-revisions', decodedFqn, page, sortString],
        queryFn: () => fetchClassRevisions(decodedFqn, page, 30, sortString),
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
                            <span className="font-bold uppercase tracking-widest text-sm">FQN Revisions Investigation</span>
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
                        <p className="text-neutral-400">All physically distinct versions of this class across the ecosystem.</p>
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
                        {revisionsData.content.map(cf => (
                            <Link
                                key={cf.id}
                                to={`/class/${cf.id}`}
                                className="p-4 hover:bg-neutral-900 transition-all group flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                            >
                                <div className="space-y-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-neutral-300 group-hover:text-cyan-400 truncate break-all">{cf.sha512}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0 text-right sm:text-left">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Size</p>
                                        <p className="font-mono text-sm">{formatBytes(cf.sizeBytes)}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Uses</p>
                                        <p className="font-mono text-sm font-bold">{cf.releaseCount}</p>
                                    </div>
                                    <ChevronRight size={20} className="text-neutral-700 group-hover:text-cyan-500 group-hover:tranneutral-x-1 transition-all" />
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
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                (revisionsData.first ?? (revisionsData?.page?.number === 0)) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
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
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                (revisionsData.last ?? (revisionsData?.page?.number + 1 >= (revisionsData?.page?.totalPages ?? revisionsData.totalPages))) ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
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


