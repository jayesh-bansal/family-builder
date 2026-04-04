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
 * Find existing parents of a person (returns their IDs).
 */
export function findParents(
  allRelationships: ExistingRelationship[],
  personId: string
): string[] {
  const parents: string[] = [];
  for (const rel of allRelationships) {
    // person_id → related_person_id with type "parent" means related_person IS person's parent
    if (
      rel.person_id === personId &&
      PARENT_TYPES.includes(rel.relationship_type as RelationshipType)
    ) {
      parents.push(rel.related_person_id);
    }
    // person_id → related_person_id with type "child" means related_person IS person's child
    // So if person_id is a child of someone: rel.related_person_id = personId, type = child
    // means personId IS rel.person_id's child → rel.person_id is a parent of personId
    if (
      rel.related_person_id === personId &&
      CHILD_TYPES.includes(rel.relationship_type as RelationshipType)
    ) {
      parents.push(rel.person_id);
    }
  }
  return [...new Set(parents)];
}

/**
 * Find existing children of a person (returns their IDs).
 */
export function findChildren(
  allRelationships: ExistingRelationship[],
  personId: string
): string[] {
  const children: string[] = [];
  for (const rel of allRelationships) {
    // person_id → related_person_id with type "child" means related_person IS person's child
    if (
      rel.person_id === personId &&
      CHILD_TYPES.includes(rel.relationship_type as RelationshipType)
    ) {
      children.push(rel.related_person_id);
    }
    // related_person_id has type "parent" on person_id → related_person is parent of person
    // Inverse: person_id → related_person_id with "parent" means related IS parent.
    // So: rel.person_id = someChild, rel.related_person_id = personId, type = "parent"
    // means personId IS someChild's parent
    if (
      rel.related_person_id === personId &&
      PARENT_TYPES.includes(rel.relationship_type as RelationshipType)
    ) {
      children.push(rel.person_id);
    }
  }
  return [...new Set(children)];
}

/**
 * Compute auto-link relationships that should be created alongside the primary one.
 *
 * Rules:
 * 1. Adding parent to A → also add parent to A's siblings
 * 2. Adding parent to A → auto-link as spouse of A's existing other parent
 * 3. Adding child to A → also add child to A's spouse
 * 4. Adding sibling to A → also link new sibling to A's existing parents
 * 5. Adding spouse to A → auto-link A's existing children to new spouse
 */
export function computeAutoLinks(
  allRelationships: ExistingRelationship[],
  relatedTo: string,
  newMemberId: string,
  relType: RelationshipType
): AutoLinkResult[] {
  const links: AutoLinkResult[] = [];
  const addedKeys = new Set<string>();

  // Helper to add a link pair with deduplication
  const addLink = (
    personA: string,
    personB: string,
    type: RelationshipType
  ) => {
    const key = [personA, personB].sort().join("-") + ":" + type;
    const invKey =
      [personA, personB].sort().join("-") + ":" + INVERSE_RELATIONSHIP[type];
    if (addedKeys.has(key) || addedKeys.has(invKey)) return;
    if (hasDuplicateRelationship(allRelationships, personA, personB, type))
      return;
    addedKeys.add(key);
    links.push({
      person_id: personA,
      related_person_id: personB,
      relationship_type: type,
    });
    links.push({
      person_id: personB,
      related_person_id: personA,
      relationship_type: INVERSE_RELATIONSHIP[type],
    });
  };

  // ── Rule 1: Adding PARENT → also add parent to siblings ──
  if (PARENT_TYPES.includes(relType)) {
    const siblings = findSiblings(allRelationships, relatedTo);
    for (const sibId of siblings) {
      addLink(sibId, newMemberId, relType);
    }
  }

  // ── Rule 2: Adding PARENT → auto-link as spouse of existing other parent ──
  if (PARENT_TYPES.includes(relType)) {
    const existingParents = findParents(allRelationships, relatedTo);
    for (const parentId of existingParents) {
      if (parentId === newMemberId) continue;
      addLink(newMemberId, parentId, "spouse");
    }
  }

  // ── Rule 3: Adding CHILD → also add child to spouse ──
  if (CHILD_TYPES.includes(relType)) {
    const spouses = findSpouses(allRelationships, relatedTo);
    for (const spouseId of spouses) {
      addLink(spouseId, newMemberId, relType);
    }
  }

  // ── Rule 4: Adding SIBLING → auto-link to existing parents ──
  if (SIBLING_TYPES.includes(relType)) {
    const existingParents = findParents(allRelationships, relatedTo);
    for (const parentId of existingParents) {
      // Add parent relationship: new sibling → existing parent
      const parentRelType = "parent" as RelationshipType;
      addLink(newMemberId, parentId, parentRelType);
    }
  }

  // ── Rule 5: Adding SPOUSE → auto-link existing children to new spouse ──
  if (relType === "spouse") {
    const existingChildren = findChildren(allRelationships, relatedTo);
    for (const childId of existingChildren) {
      if (childId === newMemberId) continue;
      // New spouse becomes parent of existing children
      const parentRelType = "parent" as RelationshipType;
      addLink(childId, newMemberId, parentRelType);
    }
  }

  return links;
}
