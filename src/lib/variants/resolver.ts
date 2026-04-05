/**
 * Relationship chain resolver.
 *
 * Computes the specific relationship term for every member in the tree
 * relative to the current user, by:
 * 1. BFS shortest-path from current user to each member
 * 2. Walking the path to build a chain key: "parent:m,sibling:f"
 * 3. Looking up the chain key in the variant's chain mappings
 * 4. Building a human-readable chain description: "Father's Sister"
 */

import type { VariantConfig, ComputedRelation, Gender } from "./types";
import type { Profile, Relationship } from "@/lib/types";
import { GLOBAL_VARIANT } from "./global";
import { INDIAN_VARIANT } from "./indian";
import type { FamilyVariant } from "./types";

export function getVariantConfig(variant: FamilyVariant): VariantConfig {
  switch (variant) {
    case "indian":
      return INDIAN_VARIANT;
    case "global":
    default:
      return GLOBAL_VARIANT;
  }
}

/**
 * Get a variant-aware label for a single relationship type.
 * Falls back to generic English label if gender isn't available.
 *
 * Usage: getRelationshipLabel("parent", "male", "indian") → "Papa"
 *        getRelationshipLabel("parent", null, "global") → "Parent"
 */
export function getRelationshipLabel(
  relType: string,
  gender: string | null | undefined,
  variant: FamilyVariant
): string {
  const config = getVariantConfig(variant);
  const g = normalizeGender(gender);
  const key = `${relType}:${genderKey(g)}`;

  // Try variant-specific hop label first
  if (config.hopLabels[key]) return config.hopLabels[key];

  // Try the "other" gender fallback
  const fallbackKey = `${relType}:o`;
  if (config.hopLabels[fallbackKey]) return config.hopLabels[fallbackKey];

  // Last resort: humanize the type string
  return relType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get variant-aware relationship dropdown options.
 * For Indian variant, labels like "Parent" become "Parent (Papa/Mummy)".
 */
export function getRelationshipOptions(
  variant: FamilyVariant
): { value: string; label: string }[] {
  const config = getVariantConfig(variant);
  const types = [
    "parent", "child", "spouse", "sibling",
    "grandparent", "grandchild",
    "step_parent", "step_child",
    "adopted_parent", "adopted_child",
    "half_sibling", "godparent", "godchild", "close_friend",
  ];

  return types.map((type) => {
    // Get the "other" gender label for the primary label
    const globalLabel = GLOBAL_VARIANT.hopLabels[`${type}:o`] ||
      type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (variant === "global") return { value: type, label: globalLabel };

    // For non-global variants, show both: "Parent (Papa/Mummy)"
    const maleLabel = config.hopLabels[`${type}:m`];
    const femaleLabel = config.hopLabels[`${type}:f`];
    if (maleLabel && femaleLabel && maleLabel !== femaleLabel) {
      return { value: type, label: `${globalLabel} (${maleLabel}/${femaleLabel})` };
    }
    const anyLabel = maleLabel || femaleLabel || config.hopLabels[`${type}:o`];
    if (anyLabel && anyLabel !== globalLabel) {
      return { value: type, label: `${globalLabel} (${anyLabel})` };
    }
    return { value: type, label: globalLabel };
  });
}

/** Normalize a gender value to our Gender type */
function normalizeGender(gender: string | null | undefined): Gender {
  if (gender === "male" || gender === "female") return gender;
  return "other";
}

/** Get the gender key for chain keys: m, f, o */
function genderKey(gender: Gender): string {
  return gender[0]; // "m", "f", "o"
}

/**
 * Compute relationship info for every member in the tree.
 *
 * Returns a Map<memberId, ComputedRelation> with:
 * - term: the specific label ("Bua", "Paternal Aunt")
 * - chain: human-readable path ("Papa's Behen", "Father's Sister")
 * - distance: number of hops from current user
 */
export function computeAllRelations(
  currentUserId: string,
  members: Profile[],
  relationships: Relationship[],
  variant: FamilyVariant
): Map<string, ComputedRelation> {
  const config = getVariantConfig(variant);
  const result = new Map<string, ComputedRelation>();
  const memberMap = new Map(members.map((m) => [m.id, m]));

  if (members.length === 0) return result;

  // ── Build adjacency ──
  // Each relationship row: person_id → related_person_id with relationship_type
  // The type describes what related_person IS to person
  const adjacency = new Map<
    string,
    { neighbor: string; hopType: string }[]
  >();

  for (const rel of relationships) {
    if (!adjacency.has(rel.person_id)) adjacency.set(rel.person_id, []);
    adjacency.get(rel.person_id)!.push({
      neighbor: rel.related_person_id,
      hopType: rel.relationship_type,
    });
  }

  // ── BFS from current user ──
  interface BFSEntry {
    predecessor: string;
    hopType: string; // what this member IS to their predecessor
  }

  const visited = new Map<string, BFSEntry>();
  visited.set(currentUserId, { predecessor: "", hopType: "" });
  const queue: string[] = [currentUserId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { neighbor, hopType } of adjacency.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, { predecessor: current, hopType });
        queue.push(neighbor);
      }
    }
  }

  // ── Reconstruct paths and compute labels ──
  for (const member of members) {
    if (member.id === currentUserId) {
      result.set(member.id, {
        term: config.selfLabel,
        chain: "",
        distance: 0,
      });
      continue;
    }

    if (!visited.has(member.id)) {
      // Disconnected member
      continue;
    }

    // Reconstruct path: walk backwards from target to current user
    const hops: { memberId: string; hopType: string; gender: Gender }[] = [];
    let cursor = member.id;

    while (cursor !== currentUserId) {
      const entry = visited.get(cursor);
      if (!entry || !entry.predecessor) break;

      const memberProfile = memberMap.get(cursor);
      const gender = normalizeGender(memberProfile?.gender ?? null);

      hops.unshift({
        memberId: cursor,
        hopType: entry.hopType,
        gender,
      });

      cursor = entry.predecessor;
    }

    if (hops.length === 0) continue;

    // Build chain key: "parent:m,sibling:f"
    const chainKey = hops
      .map((h) => `${h.hopType}:${genderKey(h.gender)}`)
      .join(",");

    // Look up computed term
    const term =
      config.chainTerms[chainKey] || buildFallbackTerm(config, hops);

    // Build chain description: "Father's Sister", "Papa's Behen"
    const chain = buildChainDescription(config, hops);

    result.set(member.id, {
      term,
      chain,
      distance: hops.length,
    });
  }

  return result;
}

/**
 * Build a fallback term when no exact chain match exists.
 * Joins single-hop labels with "'s": "Father's Brother's Wife"
 */
function buildFallbackTerm(
  config: VariantConfig,
  hops: { hopType: string; gender: Gender }[]
): string {
  return hops
    .map((h) => {
      const key = `${h.hopType}:${genderKey(h.gender)}`;
      return config.hopLabels[key] || h.hopType.replace(/_/g, " ");
    })
    .join("'s ");
}

/**
 * Build a human-readable chain description.
 * For 1 hop: just the label ("Father", "Papa")
 * For 2+ hops: join with "'s" ("Father's Sister", "Papa's Behen")
 */
function buildChainDescription(
  config: VariantConfig,
  hops: { hopType: string; gender: Gender }[]
): string {
  if (hops.length <= 1) return ""; // No chain needed for direct relations

  return hops
    .map((h) => {
      const key = `${h.hopType}:${genderKey(h.gender)}`;
      return config.hopLabels[key] || h.hopType.replace(/_/g, " ");
    })
    .join("'s ");
}
