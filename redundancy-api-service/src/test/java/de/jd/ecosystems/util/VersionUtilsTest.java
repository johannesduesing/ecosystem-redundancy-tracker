package de.jd.ecosystems.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VersionUtilsTest {

    // -------------------------------------------------------------------------
    // Basic numeric ordering
    // -------------------------------------------------------------------------

    @Test
    void sortVersions_basicNumericOrdering() {
        List<String> result = VersionUtils.sortVersions(List.of("2.0.0", "1.0.0", "1.1.0", "1.0.1"));

        assertThat(result).containsExactly("1.0.0", "1.0.1", "1.1.0", "2.0.0");
    }

    @Test
    void sortVersions_alreadySorted_returnsUnchanged() {
        List<String> result = VersionUtils.sortVersions(List.of("1.0.0", "1.1.0", "2.0.0"));

        assertThat(result).containsExactly("1.0.0", "1.1.0", "2.0.0");
    }

    @Test
    void sortVersions_singleElement_returnsSingleElement() {
        List<String> result = VersionUtils.sortVersions(List.of("3.5.2"));

        assertThat(result).containsExactly("3.5.2");
    }

    @Test
    void sortVersions_emptyList_returnsEmptyList() {
        List<String> result = VersionUtils.sortVersions(List.of());

        assertThat(result).isEmpty();
    }

    // -------------------------------------------------------------------------
    // Pre-release qualifiers: alpha/beta/rc < release (semver.org §11.3)
    // -------------------------------------------------------------------------

    @Test
    void sortVersions_preReleaseVersions_sortBeforeRelease() {
        List<String> input = List.of("1.0.0", "1.0.0-alpha", "1.0.0-beta");

        List<String> result = VersionUtils.sortVersions(input);

        // Pre-release versions must come before the plain release
        assertThat(result.indexOf("1.0.0-alpha")).isLessThan(result.indexOf("1.0.0"));
        assertThat(result.indexOf("1.0.0-beta")).isLessThan(result.indexOf("1.0.0"));
    }

    @Test
    void sortVersions_alphaBeforeBeta() {
        List<String> result = VersionUtils.sortVersions(List.of("1.0.0-beta", "1.0.0-alpha"));

        // alpha < beta lexicographically
        assertThat(result).containsExactly("1.0.0-alpha", "1.0.0-beta");
    }

    @Test
    void sortVersions_releaseCandidate_sortsBeforeRelease() {
        List<String> input = List.of("1.0.0", "1.0.0-rc1", "1.0.0-alpha", "1.0.0-beta");

        List<String> result = VersionUtils.sortVersions(input);

        // All pre-release qualifiers must precede the plain release
        int releaseIdx = result.indexOf("1.0.0");
        assertThat(result.indexOf("1.0.0-alpha")).isLessThan(releaseIdx);
        assertThat(result.indexOf("1.0.0-beta")).isLessThan(releaseIdx);
        assertThat(result.indexOf("1.0.0-rc1")).isLessThan(releaseIdx);
    }

    // -------------------------------------------------------------------------
    // Mixed major/minor/patch + pre-release
    // -------------------------------------------------------------------------

    @Test
    void sortVersions_mixedVersionsWithPreRelease() {
        List<String> input = List.of("2.0.0", "1.0.0-beta", "1.0.0", "1.0.0-alpha", "1.5.0");

        List<String> result = VersionUtils.sortVersions(input);

        // Pre-release 1.0.0-* < 1.0.0 < 1.5.0 < 2.0.0
        assertThat(result.indexOf("1.0.0-alpha")).isLessThan(result.indexOf("1.0.0"));
        assertThat(result.indexOf("1.0.0-beta")).isLessThan(result.indexOf("1.0.0"));
        assertThat(result.indexOf("1.0.0")).isLessThan(result.indexOf("1.5.0"));
        assertThat(result.indexOf("1.5.0")).isLessThan(result.indexOf("2.0.0"));
    }

    @Test
    void sortVersions_doesNotMutateOriginalList() {
        List<String> input = List.of("2.0.0", "1.0.0");

        VersionUtils.sortVersions(input); // result intentionally discarded

        assertThat(input).containsExactly("2.0.0", "1.0.0");
    }

    // -------------------------------------------------------------------------
    // Non-semver version strings
    //
    // Any string that does not match MAJOR[.MINOR[.PATCH]](-prerelease)? is
    // considered non-semver and is sorted with lower precedence than any
    // semver-compliant string. Two non-semver strings are compared
    // lexicographically (case-insensitive).
    //
    // NOTE: a bare integer like "20190606" IS recognised as semver (major
    // version 20 190 606) once 1-part versions are supported. Only strings
    // containing non-numeric/non-dot characters remain non-semver.
    // -------------------------------------------------------------------------

    @Test
    void sortVersions_dateStyleVersion_treatedAsSemver_sortsAfterSmallVersion() {
        // With 1-part version support, "20190606" is valid semver (major 20190606)
        // and therefore sorts AFTER ordinary 1.x versions.
        List<String> input = List.of("1.0.0", "20190606");

        List<String> result = VersionUtils.sortVersions(input);

        assertThat(result).containsExactly("1.0.0", "20190606");
    }

    @Test
    void sortVersions_randomTokenVersion_sortsBeforeSemver() {
        // "BUILD_fe312" does not fulfil semver.
        List<String> input = List.of("2.3.1", "BUILD_fe312", "1.0.0-alpha");

        List<String> result = VersionUtils.sortVersions(input);

        // Both semver strings (including pre-release) beat the random token
        assertThat(result.indexOf("BUILD_fe312")).isLessThan(result.indexOf("1.0.0-alpha"));
        assertThat(result.indexOf("BUILD_fe312")).isLessThan(result.indexOf("2.3.1"));
    }

    @Test
    void sortVersions_twoNonSemverStrings_comparedLexicographically() {
        // Two non-semver strings must be sorted against each other lexicographically.
        List<String> input = List.of("SNAPSHOT", "BUILD_fe312", "alpha-only");

        List<String> result = VersionUtils.sortVersions(input);

        // Lexicographic order (case-insensitive): "alpha-only" < "BUILD_fe312" <
        // "SNAPSHOT"
        assertThat(result.indexOf("alpha-only")).isLessThan(result.indexOf("BUILD_fe312"));
        assertThat(result.indexOf("BUILD_fe312")).isLessThan(result.indexOf("SNAPSHOT"));
    }

    @Test
    void sortVersions_mixedSemverAndNonSemver_semverAlwaysHasPrecedence() {
        // "SNAPSHOT" and "BUILD_fe312" are non-semver; everything else is semver.
        List<String> input = List.of("SNAPSHOT", "1.0.0-alpha", "BUILD_fe312", "2.0.0", "1.5.3");

        List<String> result = VersionUtils.sortVersions(input);

        // All semver strings must appear after all non-semver strings
        int minSemverIdx = Math.min(Math.min(
                result.indexOf("1.0.0-alpha"),
                result.indexOf("2.0.0")),
                result.indexOf("1.5.3"));
        int maxNonSemverIdx = Math.max(
                result.indexOf("SNAPSHOT"),
                result.indexOf("BUILD_fe312"));

        assertThat(minSemverIdx).isGreaterThan(maxNonSemverIdx);

        // Semver strings are still ordered correctly among themselves
        assertThat(result.indexOf("1.0.0-alpha")).isLessThan(result.indexOf("1.5.3"));
        assertThat(result.indexOf("1.5.3")).isLessThan(result.indexOf("2.0.0"));
    }

    // -------------------------------------------------------------------------
    // Abbreviated semver strings: MAJOR and MAJOR.MINOR
    //
    // "1" is treated as equivalent to "1.0.0" and "2.3" as "2.3.0".
    // Missing parts are padded to 0 during comparison.
    // -------------------------------------------------------------------------

    @Test
    void sortVersions_singlePartVersion_equivalentToFullVersion() {
        // "1" == "1.0.0" in sort order
        List<String> result = VersionUtils.sortVersions(List.of("1.0.0", "1", "1.0.1"));

        // "1" and "1.0.0" are equal; both sort before "1.0.1"
        int idx1 = result.indexOf("1");
        int idx100 = result.indexOf("1.0.0");
        int idx101 = result.indexOf("1.0.1");
        assertThat(Math.abs(idx1 - idx100)).isLessThanOrEqualTo(1); // adjacent
        assertThat(idx101).isGreaterThan(Math.max(idx1, idx100));
    }

    @Test
    void sortVersions_twoPartVersion_equivalentToFullVersion() {
        // "2.3" == "2.3.0" in sort order
        List<String> result = VersionUtils.sortVersions(List.of("2.3.1", "2.3", "2.3.0"));

        // "2.3" and "2.3.0" are equal; both sort before "2.3.1"
        int idx23 = result.indexOf("2.3");
        int idx230 = result.indexOf("2.3.0");
        int idx231 = result.indexOf("2.3.1");
        assertThat(Math.abs(idx23 - idx230)).isLessThanOrEqualTo(1); // adjacent
        assertThat(idx231).isGreaterThan(Math.max(idx23, idx230));
    }

    @Test
    void sortVersions_abbreviatedVersions_sortAdjacentToEquivalentFullVersions() {
        // Mix of abbreviated and full forms across multiple major versions
        List<String> input = List.of("2", "1.0.0", "1", "2.0.0", "1.1", "1.1.0");

        List<String> result = VersionUtils.sortVersions(input);

        // "1" / "1.0.0" < "1.1" / "1.1.0" < "2" / "2.0.0"
        assertThat(Math.max(result.indexOf("1"), result.indexOf("1.0.0")))
                .isLessThan(Math.min(result.indexOf("1.1"), result.indexOf("1.1.0")));
        assertThat(Math.max(result.indexOf("1.1"), result.indexOf("1.1.0")))
                .isLessThan(Math.min(result.indexOf("2"), result.indexOf("2.0.0")));
    }

    @Test
    void sortVersions_abbreviatedPreRelease_sortsBeforeAbbreviatedRelease() {
        // Pre-release qualifier also works with abbreviated cores
        List<String> result = VersionUtils.sortVersions(List.of("2.3", "2.3-beta", "2.3.0"));

        // "2.3-beta" < "2.3" == "2.3.0"
        assertThat(result.indexOf("2.3-beta")).isLessThan(result.indexOf("2.3"));
        assertThat(result.indexOf("2.3-beta")).isLessThan(result.indexOf("2.3.0"));
    }
}
