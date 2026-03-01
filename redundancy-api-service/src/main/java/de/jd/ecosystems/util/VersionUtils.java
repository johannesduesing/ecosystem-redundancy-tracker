package de.jd.ecosystems.util;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Semver-compliant version comparator for Maven-style version strings.
 *
 * <p>
 * Follows the semantic versioning specification (semver.org §11):
 * <ul>
 * <li>Version cores (MAJOR.MINOR.PATCH) are compared numerically.</li>
 * <li>A release version (no pre-release label) has higher precedence than the
 * same core with a pre-release label, e.g. {@code 1.0.0 > 1.0.0-beta}.</li>
 * <li>Pre-release identifiers are compared left-to-right; numeric identifiers
 * are compared as integers and have lower precedence than alphanumeric
 * identifiers (e.g. {@code 1.0.0-1 < 1.0.0-alpha}).</li>
 * <li>A larger set of pre-release identifiers has higher precedence when all
 * preceding identifiers are equal.</li>
 * </ul>
 */
public class VersionUtils {

    /**
     * A version string is considered semver-compliant when it consists of one,
     * two, or three dot-separated non-negative integers
     * ({@code MAJOR}, {@code MAJOR.MINOR}, or {@code MAJOR.MINOR.PATCH}),
     * optionally followed by a pre-release label of the form
     * {@code -<identifier>(.<identifier>)*}.
     * Missing MINOR/PATCH parts are treated as {@code 0}, so {@code "1"} is
     * equivalent to {@code "1.0.0"} and {@code "2.3"} is equivalent to
     * {@code "2.3.0"}.
     * Build-metadata ({@code +…}) is not used in Maven Central and is therefore
     * not covered here.
     */
    private static final java.util.regex.Pattern SEMVER_PATTERN = java.util.regex.Pattern.compile(
            "^\\d+(\\.\\d+){0,2}(-[a-zA-Z0-9]+(\\.[a-zA-Z0-9]+)*)?$");

    private static boolean isSemver(String version) {
        return SEMVER_PATTERN.matcher(version).matches();
    }

    public static List<String> sortVersions(List<String> versions) {
        List<String> sorted = new ArrayList<>(versions);
        sorted.sort(new MavenVersionComparator());
        return sorted;
    }

    public static class MavenVersionComparator implements Comparator<String> {

        @Override
        public int compare(String v1, String v2) {
            boolean semver1 = isSemver(v1);
            boolean semver2 = isSemver(v2);

            // Non-semver strings always have lower precedence than semver strings.
            if (semver1 && !semver2)
                return 1;
            if (!semver1 && semver2)
                return -1;
            // Two non-semver strings: fall back to lexicographic comparison.
            if (!semver1)
                return v1.compareToIgnoreCase(v2);

            // Both are semver: apply the full semver §11 algorithm below.

            int dash1 = v1.indexOf('-');
            int dash2 = v2.indexOf('-');

            String core1 = dash1 == -1 ? v1 : v1.substring(0, dash1);
            String core2 = dash2 == -1 ? v2 : v2.substring(0, dash2);
            String pre1 = dash1 == -1 ? null : v1.substring(dash1 + 1);
            String pre2 = dash2 == -1 ? null : v2.substring(dash2 + 1);

            // 1. Compare version cores numerically, padding missing parts with 0.
            String[] coreParts1 = core1.split("\\.");
            String[] coreParts2 = core2.split("\\.");
            int coreLen = Math.max(coreParts1.length, coreParts2.length);
            for (int i = 0; i < coreLen; i++) {
                int n1 = i < coreParts1.length ? parseIntSafe(coreParts1[i]) : 0;
                int n2 = i < coreParts2.length ? parseIntSafe(coreParts2[i]) : 0;
                int cmp = Integer.compare(n1, n2);
                if (cmp != 0)
                    return cmp;
            }

            // 2. Cores are equal: apply semver §11.3 pre-release precedence rules.
            // release (no label) > pre-release (has label)
            if (pre1 == null && pre2 == null)
                return 0;
            if (pre1 == null)
                return 1; // v1 is a release, v2 is pre-release → v1 > v2
            if (pre2 == null)
                return -1; // v1 is pre-release, v2 is a release → v1 < v2

            // 3. Both have pre-release labels: compare identifier by identifier (§11.4).
            String[] preIds1 = pre1.split("\\.");
            String[] preIds2 = pre2.split("\\.");
            int preLen = Math.min(preIds1.length, preIds2.length);
            for (int i = 0; i < preLen; i++) {
                String id1 = preIds1[i];
                String id2 = preIds2[i];
                if (id1.equals(id2))
                    continue;

                boolean isNum1 = id1.matches("\\d+");
                boolean isNum2 = id2.matches("\\d+");

                if (isNum1 && isNum2) {
                    int cmp = Integer.compare(Integer.parseInt(id1), Integer.parseInt(id2));
                    if (cmp != 0)
                        return cmp;
                } else if (isNum1) {
                    return -1; // numeric < alphanumeric (§11.4.1.3)
                } else if (isNum2) {
                    return 1;
                } else {
                    int cmp = id1.compareToIgnoreCase(id2);
                    if (cmp != 0)
                        return cmp;
                }
            }
            // Larger set of fields has higher precedence (§11.4.4).
            return Integer.compare(preIds1.length, preIds2.length);
        }

        private static int parseIntSafe(String s) {
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException e) {
                return 0;
            }
        }
    }
}
