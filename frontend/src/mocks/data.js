/**
 * Coherent mock dataset for frontend-only development.
 * Shapes mirror the backend DTOs/entities:
 * - ComponentListDTO { id, groupId, artifactId, status, lastModified }
 * - Component { + releases: Release[] }
 * - Release { id, version, status, lastModified, component }
 * - ProjectFile { id, fqn, fileType, code/isCode, sha512, sizeBytes, releaseCount }
 * - GlobalStatsDTO, ReleaseDiffDTO { + ClassDiffDTO[] }, ReleaseHistoryPointDTO
 */

export const mockComponents = [
    { id: 1, groupId: 'org.apache.commons', artifactId: 'commons-lang3', status: 'READY', lastModified: '2026-09-28T10:00:00' },
    { id: 2, groupId: 'org.slf4j', artifactId: 'slf4j-api', status: 'READY', lastModified: '2026-09-27T10:00:00' },
    { id: 3, groupId: 'com.google.guava', artifactId: 'guava', status: 'PENDING', lastModified: '2026-09-29T10:00:00' },
]

const componentRef = (id, groupId, artifactId, status = 'READY') => ({ id, groupId, artifactId, status })

export { componentRef }

export const mockComponentDetails = {
    'org.apache.commons:commons-lang3': {
        id: 1,
        groupId: 'org.apache.commons',
        artifactId: 'commons-lang3',
        status: 'READY',
        lastModified: '2026-09-28T10:00:00',
        releases: [
            { id: 11, version: '3.12.0', status: 'READY', lastModified: '2026-09-25T10:00:00' },
            { id: 12, version: '3.13.0', status: 'READY', lastModified: '2026-09-26T10:00:00' },
            { id: 13, version: '3.14.0', status: 'READY', lastModified: '2026-09-28T10:00:00' },
        ],
    },
    'org.slf4j:slf4j-api': {
        id: 2,
        groupId: 'org.slf4j',
        artifactId: 'slf4j-api',
        status: 'READY',
        lastModified: '2026-09-27T10:00:00',
        releases: [
            { id: 21, version: '2.0.9', status: 'READY', lastModified: '2026-09-26T10:00:00' },
            { id: 22, version: '2.0.12', status: 'PENDING', lastModified: '2026-09-27T10:00:00' },
        ],
    },
}

export const mockGlobalStats = {
    totalComponents: 3,
    totalReleases: 5,
    totalUniqueFiles: 412,
    totalFileOccurrences: 1024,
}

export const mockTopFiles = [
    { id: 101, fqn: 'org.apache.commons.lang3.StringUtils.class', fileType: 'class', code: true, isCode: true, sha512: 'aaa111', sizeBytes: 48210, releaseCount: 87 },
    { id: 102, fqn: 'org.slf4j.LoggerFactory.class', fileType: 'class', code: true, isCode: true, sha512: 'bbb222', sizeBytes: 12480, releaseCount: 64 },
    { id: 103, fqn: 'com.google.common.base.Preconditions.class', fileType: 'class', code: true, isCode: true, sha512: 'ccc333', sizeBytes: 15930, releaseCount: 51 },
    { id: 104, fqn: 'META-INF.MANIFEST.MF', fileType: 'manifest', code: false, isCode: false, sha512: 'ddd444', sizeBytes: 890, releaseCount: 48 },
]

export const mockHistory = {
    'org.apache.commons:commons-lang3': {
        // codeOnly=true: only .class files
        codeOnly: [
            { version: '3.12.0', addedCount: 148, removedCount: 0, modifiedCount: 0, totalCount: 148 },
            { version: '3.13.0', addedCount: 4, removedCount: 1, modifiedCount: 6, totalCount: 151 },
            { version: '3.14.0', addedCount: 5, removedCount: 2, modifiedCount: 3, totalCount: 154 },
        ],
        // codeOnly=false: includes META-INF resources, pom files, etc.
        allFiles: [
            { version: '3.12.0', addedCount: 165, removedCount: 0, modifiedCount: 0, totalCount: 165 },
            { version: '3.13.0', addedCount: 6, removedCount: 1, modifiedCount: 7, totalCount: 170 },
            { version: '3.14.0', addedCount: 8, removedCount: 3, modifiedCount: 4, totalCount: 175 },
        ],
    },
}

const file = (id, fqn, sha512, sizeBytes) => ({ id, fqn, sha512, sizeBytes })

// First-release (3.12.0) fixtures are generated: every file in the baseline
// release counts as "added", so entry counts match the history points
// (148 code files, 165 files incl. resources). Names mirror real lang3 packages.
const LANG3_PACKAGES = {
    'org.apache.commons.lang3': ['AnnotationUtils', 'ArrayUtils', 'BitField', 'BooleanUtils', 'CharEncoding', 'CharSequenceUtils', 'CharSet', 'CharSetUtils', 'CharUtils', 'ClassLoaderUtils', 'ClassPathUtils', 'ClassUtils', 'Conversion', 'LocaleUtils', 'ObjectUtils', 'RandomStringUtils', 'RandomUtils', 'Range', 'RegExUtils', 'StringEscapeUtils', 'StringUtils', 'SystemUtils', 'ThreadUtils', 'Validate'],
    'org.apache.commons.lang3.builder': ['Builder', 'CompareToBuilder', 'Diff', 'DiffBuilder', 'DiffResult', 'Diffable', 'EqualsBuilder', 'HashCodeBuilder', 'MultilineRecursiveToStringStyle', 'RecursiveToStringStyle', 'ReflectionDiffBuilder', 'ReflectionToStringBuilder', 'StandardToStringStyle', 'ToStringBuilder', 'ToStringStyle'],
    'org.apache.commons.lang3.compare': ['ComparableUtils', 'ObjectToStringComparator'],
    'org.apache.commons.lang3.concurrent': ['AtomicInitializer', 'AtomicSafeInitializer', 'BackgroundInitializer', 'BasicThreadFactory', 'CallableBackgroundInitializer', 'CircuitBreaker', 'CircuitBreakingException', 'ConcurrentException', 'ConcurrentInitializer', 'ConcurrentRuntimeException', 'ConcurrentUtils', 'ConstantInitializer', 'FutureBackgroundInitializer', 'LazyInitializer', 'MultiBackgroundInitializer', 'MultiException', 'ThresholdCircuitBreaker', 'TimedSemaphore'],
    'org.apache.commons.lang3.enum': ['Enum', 'EnumUtils', 'ValuedEnum'],
    'org.apache.commons.lang3.event': ['EventListenerSupport', 'EventUtils'],
    'org.apache.commons.lang3.exception': ['CloneFailedException', 'ContextedException', 'ContextedRuntimeException', 'DefaultExceptionContext', 'ExceptionContext', 'ExceptionUtils'],
    'org.apache.commons.lang3.function': ['Failable', 'FailableBiConsumer', 'FailableBiFunction', 'FailableBiPredicate', 'FailableBooleanSupplier', 'FailableCallable', 'FailableConsumer', 'FailableFunction', 'FailableIntFunction', 'FailableIntPredicate', 'FailableIntSupplier', 'FailableLongFunction', 'FailableLongPredicate', 'FailableLongSupplier', 'FailablePredicate', 'FailableRunnable', 'FailableSupplier', 'FailableToDoubleBiFunction', 'FailableToDoubleFunction', 'FailableToIntBiFunction', 'FailableToIntFunction', 'FailableToLongBiFunction', 'FailableToLongFunction', 'Functions'],
    'org.apache.commons.lang3.math': ['Fraction', 'IEEE754rUtils', 'NumberUtils'],
    'org.apache.commons.lang3.mutable': ['Mutable', 'MutableBoolean', 'MutableByte', 'MutableDouble', 'MutableFloat', 'MutableInt', 'MutableLong', 'MutableObject', 'MutableShort'],
    'org.apache.commons.lang3.reflect': ['ConstructorUtils', 'FieldUtils', 'InheritanceUtils', 'MemberUtils', 'MethodUtils', 'TypeLiteral', 'TypeUtils', 'Typed'],
    'org.apache.commons.lang3.text': ['CompositeFormat', 'ExtendedMessageFormat', 'FormatFactory', 'FormattableUtils', 'StrBuilder', 'StrLookup', 'StrMatcher', 'StrSubstitutor', 'StrTokenizer', 'WordUtils'],
    'org.apache.commons.lang3.text.translate': ['AggregateTranslator', 'CharSequenceTranslator', 'EntityArrays', 'LookupTranslator', 'UnicodeEscaper', 'UnicodeUnescaper'],
    'org.apache.commons.lang3.time': ['CalendarUtils', 'DateFormatUtils', 'DateParser', 'DatePrinter', 'DateUtils', 'DurationFormatUtils', 'FastDateFormat', 'FastDateParser', 'FastDatePrinter', 'FastTimeZone', 'StopWatch', 'TimeZones'],
    'org.apache.commons.lang3.tuple': ['ImmutablePair', 'ImmutableTriple', 'MutablePair', 'MutableTriple', 'Pair', 'Triple'],
}

const LANG3_312_RESOURCES = [
    'META-INF/MANIFEST.MF', 'META-INF/NOTICE.txt', 'META-INF/LICENSE.txt', 'META-INF/DEPENDENCIES',
    'META-INF/DISCLAIMER', 'META-INF/README.txt', 'META-INF/KEYS',
    'META-INF/maven/org.apache.commons/commons-lang3/pom.xml',
    'META-INF/maven/org.apache.commons/commons-lang3/pom.properties',
    'META-INF/maven/org.apache.commons/commons-parent/pom.xml',
    'org/apache/commons/lang3/package.html', 'org/apache/commons/lang3/builder/package.html',
    'org/apache/commons/lang3/concurrent/package.html', 'org/apache/commons/lang3/exception/package.html',
    'org/apache/commons/lang3/function/package.html', 'org/apache/commons/lang3/time/package.html',
    'org/apache/commons/lang3/text/package.html',
]

let next312Id = 3200
const sumSizes = (entries) => entries.reduce((s, f) => s + f.sizeBytes, 0)
const lang312CodeAdded = Object.entries(LANG3_PACKAGES).flatMap(([pkg, names], p) =>
    names.map((n, i) => {
        const fqn = `${pkg}.${n}.class`
        return file(next312Id++, fqn, `sha312-${p}-${i}`, 4000 + ((fqn.length * 733 + i * 131) % 36000))
    }),
)
const lang312ResourcesAdded = LANG3_312_RESOURCES.map((fqn, i) =>
    file(next312Id++, fqn, `sha312r-${i}`, 300 + ((fqn.length * 977 + i * 57) % 8000)),
)

export const mockDiffs = {
    // key: `${groupId}:${artifactId}:${version}:${baseVersion || 'auto'}:${codeOnly}`
    // 3.12.0 is the baseline release: everything counts as added.
    'org.apache.commons:commons-lang3:3.12.0:auto:true': {
        version: '3.12.0',
        previousVersion: null,
        totalClasses: lang312CodeAdded.length,
        totalSizeBytes: sumSizes(lang312CodeAdded),
        added: lang312CodeAdded,
        addedSizeBytes: sumSizes(lang312CodeAdded),
        removed: [],
        removedSizeBytes: 0,
        modified: [],
        modifiedSizeBytes: 0,
    },
    'org.apache.commons:commons-lang3:3.12.0:auto:false': {
        version: '3.12.0',
        previousVersion: null,
        totalClasses: lang312CodeAdded.length + lang312ResourcesAdded.length,
        totalSizeBytes: sumSizes(lang312CodeAdded) + sumSizes(lang312ResourcesAdded),
        added: [...lang312CodeAdded, ...lang312ResourcesAdded],
        addedSizeBytes: sumSizes(lang312CodeAdded) + sumSizes(lang312ResourcesAdded),
        removed: [],
        removedSizeBytes: 0,
        modified: [],
        modifiedSizeBytes: 0,
    },
    // 3.13.0 vs 3.12.0, code only
    'org.apache.commons:commons-lang3:3.13.0:auto:true': {
        version: '3.13.0',
        previousVersion: '3.12.0',
        totalClasses: 151,
        totalSizeBytes: 998400,
        added: [
            file(1101, 'org.apache.commons.lang3.function.FailableShortSupplier.class', 'sha-a313-1', 3210),
            file(1102, 'org.apache.commons.lang3.compare.ComparableUtils.class', 'sha-a313-2', 6840),
            file(1103, 'org.apache.commons.lang3.time.DurationUtils.class', 'sha-a313-3', 9120),
            file(1104, 'org.apache.commons.lang3.exception.UncheckedException.class', 'sha-a313-4', 2870),
        ],
        addedSizeBytes: 22040,
        removed: [file(1105, 'org.apache.commons.lang3.text.StrLookup.class', 'sha-r313-1', 5420)],
        removedSizeBytes: 5420,
        modified: [
            file(1106, 'org.apache.commons.lang3.StringUtils.class', 'sha-m313-1', 47950),
            file(1107, 'org.apache.commons.lang3.ArrayUtils.class', 'sha-m313-2', 39500),
            file(1108, 'org.apache.commons.lang3.math.NumberUtils.class', 'sha-m313-3', 41200),
            file(1109, 'org.apache.commons.lang3.BooleanUtils.class', 'sha-m313-4', 30110),
            file(1110, 'org.apache.commons.lang3.SystemUtils.class', 'sha-m313-5', 27480),
            file(1111, 'org.apache.commons.lang3.CharUtils.class', 'sha-m313-6', 19870),
        ],
        modifiedSizeBytes: 206110,
    },
    // 3.13.0 vs 3.12.0, all files (extra non-code resources)
    'org.apache.commons:commons-lang3:3.13.0:auto:false': {
        version: '3.13.0',
        previousVersion: '3.12.0',
        totalClasses: 170,
        totalSizeBytes: 1038900,
        added: [
            file(1101, 'org.apache.commons.lang3.function.FailableShortSupplier.class', 'sha-a313-1', 3210),
            file(1102, 'org.apache.commons.lang3.compare.ComparableUtils.class', 'sha-a313-2', 6840),
            file(1103, 'org.apache.commons.lang3.time.DurationUtils.class', 'sha-a313-3', 9120),
            file(1104, 'org.apache.commons.lang3.exception.UncheckedException.class', 'sha-a313-4', 2870),
            file(1206, 'META-INF/maven/org.apache.commons/commons-lang3/pom.properties', 'sha-nc313-1', 610),
            file(1207, 'META-INF/NOTICE.txt', 'sha-nc313-2', 315),
        ],
        addedSizeBytes: 22965,
        removed: [file(1105, 'org.apache.commons.lang3.text.StrLookup.class', 'sha-r313-1', 5420)],
        removedSizeBytes: 5420,
        modified: [
            file(1106, 'org.apache.commons.lang3.StringUtils.class', 'sha-m313-1', 47950),
            file(1107, 'org.apache.commons.lang3.ArrayUtils.class', 'sha-m313-2', 39500),
            file(1108, 'org.apache.commons.lang3.math.NumberUtils.class', 'sha-m313-3', 41200),
            file(1109, 'org.apache.commons.lang3.BooleanUtils.class', 'sha-m313-4', 30110),
            file(1110, 'org.apache.commons.lang3.SystemUtils.class', 'sha-m313-5', 27480),
            file(1111, 'org.apache.commons.lang3.CharUtils.class', 'sha-m313-6', 19870),
            file(1208, 'META-INF/MANIFEST.MF', 'sha-nc313-3', 950),
        ],
        modifiedSizeBytes: 207060,
    },
    // 3.14.0 vs 3.13.0 (auto-detected baseline), code only
    'org.apache.commons:commons-lang3:3.14.0:auto:true': {
        version: '3.14.0',
        previousVersion: '3.13.0',
        totalClasses: 154,
        totalSizeBytes: 1024000,
        added: [
            file(1001, 'org.apache.commons.lang3.Strings.class', 'sha-added-1', 18230),
            file(1002, 'org.apache.commons.lang3.function.TriFunction.class', 'sha-added-2', 4210),
            file(1006, 'org.apache.commons.lang3.function.FailableByteSupplier.class', 'sha-added-3', 2980),
            file(1007, 'org.apache.commons.lang3.Streams.class', 'sha-added-4', 7640),
            file(1008, 'org.apache.commons.lang3.arch.Processor.class', 'sha-added-5', 5120),
        ],
        addedSizeBytes: 38180,
        removed: [
            file(1003, 'org.apache.commons.lang3.CharSet.class', 'sha-removed-1', 8115),
            file(1009, 'org.apache.commons.lang3.text.StrTokenizer.class', 'sha-removed-2', 12480),
        ],
        removedSizeBytes: 20595,
        modified: [
            file(1004, 'org.apache.commons.lang3.StringUtils.class', 'sha-modified-1', 48210),
            file(1005, 'org.apache.commons.lang3.ArrayUtils.class', 'sha-modified-2', 39880),
            file(1010, 'org.apache.commons.lang3.math.NumberUtils.class', 'sha-modified-3', 41890),
        ],
        modifiedSizeBytes: 129980,
    },
    // 3.14.0 vs 3.13.0, all files (extra non-code resources)
    'org.apache.commons:commons-lang3:3.14.0:auto:false': {
        version: '3.14.0',
        previousVersion: '3.13.0',
        totalClasses: 175,
        totalSizeBytes: 1065000,
        added: [
            file(1001, 'org.apache.commons.lang3.Strings.class', 'sha-added-1', 18230),
            file(1002, 'org.apache.commons.lang3.function.TriFunction.class', 'sha-added-2', 4210),
            file(1006, 'org.apache.commons.lang3.function.FailableByteSupplier.class', 'sha-added-3', 2980),
            file(1007, 'org.apache.commons.lang3.Streams.class', 'sha-added-4', 7640),
            file(1008, 'org.apache.commons.lang3.arch.Processor.class', 'sha-added-5', 5120),
            file(1201, 'META-INF/maven/org.apache.commons/commons-lang3/pom.properties', 'sha-nc314-1', 640),
            file(1202, 'META-INF/maven/org.apache.commons/commons-lang3/pom.xml', 'sha-nc314-2', 8120),
            file(1203, 'META-INF/NOTICE.txt', 'sha-nc314-3', 320),
        ],
        addedSizeBytes: 47260,
        removed: [
            file(1003, 'org.apache.commons.lang3.CharSet.class', 'sha-removed-1', 8115),
            file(1009, 'org.apache.commons.lang3.text.StrTokenizer.class', 'sha-removed-2', 12480),
            file(1204, 'META-INF/DEPENDENCIES', 'sha-nc314-4', 1540),
        ],
        removedSizeBytes: 22135,
        modified: [
            file(1004, 'org.apache.commons.lang3.StringUtils.class', 'sha-modified-1', 48210),
            file(1005, 'org.apache.commons.lang3.ArrayUtils.class', 'sha-modified-2', 39880),
            file(1010, 'org.apache.commons.lang3.math.NumberUtils.class', 'sha-modified-3', 41890),
            file(1205, 'META-INF/MANIFEST.MF', 'sha-nc314-5', 980),
        ],
        modifiedSizeBytes: 130960,
    },
    // 3.14.0 vs explicit baseline 3.12.0 (cumulative), code only
    'org.apache.commons:commons-lang3:3.14.0:3.12.0:true': {
        version: '3.14.0',
        previousVersion: '3.12.0',
        totalClasses: 154,
        totalSizeBytes: 1024000,
        added: [
            file(1101, 'org.apache.commons.lang3.function.FailableShortSupplier.class', 'sha-a313-1', 3210),
            file(1102, 'org.apache.commons.lang3.compare.ComparableUtils.class', 'sha-a313-2', 6840),
            file(1103, 'org.apache.commons.lang3.time.DurationUtils.class', 'sha-a313-3', 9120),
            file(1104, 'org.apache.commons.lang3.exception.UncheckedException.class', 'sha-a313-4', 2870),
            file(1001, 'org.apache.commons.lang3.Strings.class', 'sha-added-1', 18230),
            file(1002, 'org.apache.commons.lang3.function.TriFunction.class', 'sha-added-2', 4210),
            file(1006, 'org.apache.commons.lang3.function.FailableByteSupplier.class', 'sha-added-3', 2980),
            file(1007, 'org.apache.commons.lang3.Streams.class', 'sha-added-4', 7640),
            file(1008, 'org.apache.commons.lang3.arch.Processor.class', 'sha-added-5', 5120),
        ],
        addedSizeBytes: 60220,
        removed: [
            file(1105, 'org.apache.commons.lang3.text.StrLookup.class', 'sha-r313-1', 5420),
            file(1003, 'org.apache.commons.lang3.CharSet.class', 'sha-removed-1', 8115),
            file(1009, 'org.apache.commons.lang3.text.StrTokenizer.class', 'sha-removed-2', 12480),
        ],
        removedSizeBytes: 26015,
        modified: [
            file(1004, 'org.apache.commons.lang3.StringUtils.class', 'sha-modified-1', 48210),
            file(1005, 'org.apache.commons.lang3.ArrayUtils.class', 'sha-modified-2', 39880),
            file(1010, 'org.apache.commons.lang3.math.NumberUtils.class', 'sha-modified-3', 41890),
            file(1109, 'org.apache.commons.lang3.BooleanUtils.class', 'sha-m313-4', 30110),
            file(1110, 'org.apache.commons.lang3.SystemUtils.class', 'sha-m313-5', 27480),
            file(1111, 'org.apache.commons.lang3.CharUtils.class', 'sha-m313-6', 19870),
        ],
        modifiedSizeBytes: 207440,
    },
}

export const mockFileRevisions = {
    'org.apache.commons.lang3.StringUtils.class': [
        { id: 1004, fqn: 'org.apache.commons.lang3.StringUtils.class', fileType: 'class', code: true, isCode: true, sha512: 'sha-modified-1', sizeBytes: 48210, releaseCount: 12 },
        { id: 2004, fqn: 'org.apache.commons.lang3.StringUtils.class', fileType: 'class', code: true, isCode: true, sha512: 'sha-older-rev-9f8e', sizeBytes: 47950, releaseCount: 8 },
        { id: 3004, fqn: 'org.apache.commons.lang3.StringUtils.class', fileType: 'class', code: true, isCode: true, sha512: 'sha-oldest-rev-1234', sizeBytes: 47100, releaseCount: 3 },
    ],
    'META-INF/MANIFEST.MF': [
        { id: 1205, fqn: 'META-INF/MANIFEST.MF', fileType: 'manifest', code: false, isCode: false, sha512: 'sha-nc314-5', sizeBytes: 980, releaseCount: 5 },
        { id: 1305, fqn: 'META-INF/MANIFEST.MF', fileType: 'manifest', code: false, isCode: false, sha512: 'sha-nc313-3', sizeBytes: 950, releaseCount: 3 },
    ],
}

export const mockFileById = {
    1004: { id: 1004, fqn: 'org.apache.commons.lang3.StringUtils.class', fileType: 'class', code: true, isCode: true, sha512: 'sha-modified-1', sizeBytes: 48210, releaseCount: 12 },
    101: { id: 101, fqn: 'org.apache.commons.lang3.StringUtils.class', fileType: 'class', code: true, isCode: true, sha512: 'aaa111', sizeBytes: 48210, releaseCount: 87 },
}

export const mockReleasesForFile = {
    1004: [
        { id: 13, version: '3.14.0', status: 'READY', component: componentRef(1, 'org.apache.commons', 'commons-lang3') },
        { id: 12, version: '3.13.0', status: 'READY', component: componentRef(1, 'org.apache.commons', 'commons-lang3') },
        { id: 30, version: '1.4.0', status: 'READY', component: componentRef(9, 'com.example', 'shaded-lib') },
    ],
    101: [
        { id: 13, version: '3.14.0', status: 'READY', component: componentRef(1, 'org.apache.commons', 'commons-lang3') },
        { id: 31, version: '2.1.0', status: 'READY', component: componentRef(10, 'com.example', 'other-lib') },
    ],
}

/** Build a Spring Data Page payload. The frontend reads both flat and `page.*` shapes. */
export function toPage(content, page = 0, size = 10, totalElements = content.length) {
    const totalPages = Math.max(1, Math.ceil(totalElements / size))
    return {
        content,
        totalElements,
        totalPages,
        number: page,
        size,
        first: page === 0,
        last: page >= totalPages - 1,
        empty: content.length === 0,
        page: { number: page, size, totalElements, totalPages },
    }
}
