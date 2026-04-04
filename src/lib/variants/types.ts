/**
 * Family tree variant system types.
 *
 * Two variants:
 * - "global" — Western-style labels (Father, Mother, Uncle, Aunt, etc.)
 * - "indian" — Hindi/Indian-style labels (Papa, Mummy, Chacha, Bua, etc.)
 *
 * Both share the same DB schema. The variant only affects display labels.
 */

export type FamilyVariant = "global" | "indian";

export type Gender = "male" | "female" | "other";

/**
 * A single hop in the relationship chain from "me" to a target member.
 */
export interface ChainHop {
  memberId: string;
  /** The relationship type that describes what this member IS to their predecessor */
  hopType: string;
  /** Gender of this member */
  gender: Gender;
}

/**
 * Computed relationship info for a family member relative to the current user.
 */
export interface ComputedRelation {
  /** The specific relationship term: "Bua", "Paternal Aunt", etc. */
  term: string;
  /** Chain description: "Papa's Behen", "Father's Sister", etc. */
  chain: string;
  /** Number of hops from the current user */
  distance: number;
}

/**
 * Variant configuration: chain mappings + hop labels.
 */
export interface VariantConfig {
  /** Display name of this variant */
  name: string;
  /** Map from chain key (e.g. "parent:m,sibling:f") to computed term (e.g. "Bua") */
  chainTerms: Record<string, string>;
  /** Map from single hop key (e.g. "parent:m") to label (e.g. "Papa") for building chain descriptions */
  hopLabels: Record<string, string>;
  /** Label for "Me" / the current user */
  selfLabel: string;
  /** Prefix for computed relation display: "My Bua", "Meri Bua" */
  myPrefix: string;
}
