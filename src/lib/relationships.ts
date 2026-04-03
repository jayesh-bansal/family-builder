/**
 * Relationship validation and auto-linking logic.
 *
 * Handles edge cases:
 * 1. Duplicate prevention — can't create same relationship type between same pair
 * 2. Contradictory prevention — can't be both parent & child of same person
 * 3. Sibling auto-linking — adding a parent auto-links to all siblings
 * 4. Spouse auto-linking — adding a child auto-links to spouse
 */

import type { RelationshipType } from "./types";
import { INVERSE_RELATIONSHIP } from "./types";

/** Relationship types that imply a parent role */
const PARENT_TYPES: RelationshipType[] = [
  "parent",
  "step_parent",
  "adopted_parent",
  "grandparent",
  "godparent",
];

/** Relationship types that imply a child role */
const CHILD_TYPES: RelationshipType[] = [
  "child",
  "step_child",
  "adopted_child",
  "grandchild",
  "godchild",
];

/** Symmetric relationships (same in both directions) */
const SYMMETRIC_TYPES: RelationshipType[] = [
  "spouse",
  "sibling",
  "half_sibling",
  "close_friend",
];

/** Sibling-like relationship types */
const SIBLING_TYPES: RelationshipType[] = [
  "sibling",
  "half_sibling",
];

interface ExistingRelationship {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: string;
}

/**
 * Check if a relationship already exists between two people (in either direction).
 */
export function hasDuplicateRelationship(
  existing: ExistingRelationship[],
  personA: string,
  personB: string,
  relType: RelationshipType
): boolean {
  const inverse = INVERSE_RELATIONSHIP[relType];
  return existing.some(
    (r) =>
      (r.person_id === personA &&
        r.related_person_id === personB &&
        r.relationship_type === relType) ||
      (r.person_id === personB &&
        r.related_person_id === personA &&
        r.relationship_type === inverse)
  );
}

/**
 * Check if adding this relationship would create a contradiction.
 * E.g., A is parent of B, but trying to make B parent of A.
 */
export function hasContradiction(
  existing: ExistingRelationship[],
  personA: string,
  personB: string,
  relType: RelationshipType
): string | null {
  for (const rel of existing) {
    const isPairAB =
      (rel.person_id === personA && rel.related_person_id === personB) ||
      (rel.person_id === personB && rel.related_person_id === personA);
    if (!isPairAB) continue;

    const existingType = rel.relationship_type as RelationshipType;

    // Parent ↔ Child contradiction
    if (PARENT_TYPES.includes(relType) && PARENT_TYPES.includes(existingType)) {
      // Both directions are parent — contradiction only if the directions are swapped
      if (
        (rel.person_id === personA && CHILD_TYPES.includes(INVERSE_RELATIONSHIP[existingType])) ||
        (rel.person_id === personB && rel.relationship_type === relType)
      ) {
        continue; // Same direction, not contradiction
      }
    }

    // Can't be parent AND child of same person
    if (
      (PARENT_TYPES.includes(relType) &&
        CHILD_TYPES.includes(existingType) &&
        rel.person_id === personA &&
        rel.related_person_id === personB) ||
      (CHILD_TYPES.includes(relType) &&
        PARENT_TYPES.includes(existingType) &&
        rel.person_id === personA &&
        rel.related_person_id === personB)
    ) {
      return `Cannot add "${relType}" — a conflicting "${existingType}" relationship already exists.`;
    }

    // Can't be spouse AND parent/child
    if (
      existingType === "spouse" &&
      (PARENT_TYPES.includes(relType) || CHILD_TYPES.includes(relType))
    ) {
      return `Cannot add "${relType}" — this person is already a spouse.`;
    }
    if (
      relType === "spouse" &&
      (PARENT_TYPES.includes(existingType) || CHILD_TYPES.includes(existingType))
    ) {
      return `Cannot add "spouse" — a "${existingType}" relationship already exists.`;
    }
  }
  return null;
}

/**
 * Find siblings of a person from the relationship list.
 * Returns IDs of people who are siblings/half_siblings of `personId`.
 */
export function findSiblings(
  allRelationships: ExistingRelationship[],
  personId: string
): string[] {
  const siblings: string[] = [];
  for (const rel of allRelationships) {
    if (!SIBLING_TYPES.includes(rel.relationship_type as RelationshipType)) continue;
    if (rel.person_id === personId) siblings.push(rel.related_person_id);
    else if (rel.related_person_id === personId) siblings.push(rel.person_id);
  }
  return [...new Set(siblings)];
}

/**
 * Find spouse(s) of a person.
 */
export function findSpouses(
  allRelationships: ExistingRelationship[],
  personId: string
): string[] {
  const spouses: string[] = [];
  for (const rel of allRelationships) {
    if (rel.relationship_type !== "spouse") continue;
    if (rel.person_id === personId) spouses.push(rel.related_person_id);
    else if (rel.related_person_id === personId) spouses.push(rel.person_id);
  }
  return [...new Set(spouses)];
}

interface AutoLinkResult {
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
}

/**
 * Compute auto-link relationships that should be created alongside the primary one.
 *
 * Rules:
 * - Adding parent to person A → also add parent to A's siblings
 * - Adding child to person A → also add child to A's spouse
 * - Adding sibling to person A → also link new sibling to A's existing parents
 */
export function computeAutoLinks(
  allRelationships: ExistingRelationship[],
  relatedTo: string,
  newMemberId: string,
  relType: RelationshipType
): AutoLinkResult[] {
  const links: AutoLinkResult[] = [];

  // If adding a PARENT type → auto-link to siblings
  if (PARENT_TYPES.includes(relType)) {
    const siblings = findSiblings(allRelationships, relatedTo);
    for (const sibId of siblings) {
      // Check not already linked
      if (
        !hasDuplicateRelationship(
          allRelationships,
          sibId,
          newMemberId,
          relType
        )
      ) {
        links.push({
          person_id: sibId,
          related_person_id: newMemberId,
          relationship_type: relType,
        });
        links.push({
          person_id: newMemberId,
          related_person_id: sibId,
          relationship_type: INVERSE_RELATIONSHIP[relType],
        });
      }
    }
  }

  // If adding a CHILD type → auto-link to spouse
  if (CHILD_TYPES.includes(relType)) {
    const spouses = findSpouses(allRelationships, relatedTo);
    for (const spouseId of spouses) {
      if (
        !hasDuplicateRelationship(
          allRelationships,
          spouseId,
          newMemberId,
          relType
        )
      ) {
        links.push({
          person_id: spouseId,
          related_person_id: newMemberId,
          relationship_type: relType,
        });
        links.push({
          person_id: newMemberId,
          related_person_id: spouseId,
          relationship_type: INVERSE_RELATIONSHIP[relType],
        });
      }
    }
  }

  // If adding a SIBLING → auto-link to existing parents of relatedTo
  if (SIBLING_TYPES.includes(relType)) {
    for (const rel of allRelationships) {
      // Find parents of relatedTo
      if (
        rel.related_person_id === relatedTo &&
        CHILD_TYPES.includes(rel.relationship_type as RelationshipType)
      ) {
        // rel.person_id is a parent of relatedTo
        const parentId = rel.person_id;
        const parentType = INVERSE_RELATIONSHIP[rel.relationship_type as RelationshipType];
        if (
          !hasDuplicateRelationship(
            allRelationships,
            newMemberId,
            parentId,
            parentType
          )
        ) {
          links.push({
            person_id: newMemberId,
            related_person_id: parentId,
            relationship_type: parentType,
          });
          links.push({
            person_id: parentId,
            related_person_id: newMemberId,
            relationship_type: rel.relationship_type as RelationshipType,
          });
        }
      }
      if (
        rel.person_id === relatedTo &&
        PARENT_TYPES.includes(rel.relationship_type as RelationshipType)
      ) {
        const parentId = rel.related_person_id;
        const parentType = rel.relationship_type as RelationshipType;
        if (
          !hasDuplicateRelationship(
            allRelationships,
            newMemberId,
            parentId,
            parentType
          )
        ) {
          links.push({
            person_id: newMemberId,
            related_person_id: parentId,
            relationship_type: INVERSE_RELATIONSHIP[parentType],
          });
          links.push({
            person_id: parentId,
            related_person_id: newMemberId,
            relationship_type: parentType,
          });
        }
      }
    }
  }

  return links;
}
