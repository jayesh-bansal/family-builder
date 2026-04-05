import type { VariantConfig } from "./types";

/**
 * Global (Western) variant — English relationship labels.
 */
export const GLOBAL_VARIANT: VariantConfig = {
  name: "Global",
  selfLabel: "Me",
  myPrefix: "My",

  // ── Single-hop labels (for building chain descriptions) ──
  hopLabels: {
    // Core
    "parent:m": "Father",
    "parent:f": "Mother",
    "parent:o": "Parent",
    "child:m": "Son",
    "child:f": "Daughter",
    "child:o": "Child",
    "spouse:m": "Husband",
    "spouse:f": "Wife",
    "spouse:o": "Spouse",
    "sibling:m": "Brother",
    "sibling:f": "Sister",
    "sibling:o": "Sibling",

    // Extended
    "grandparent:m": "Grandfather",
    "grandparent:f": "Grandmother",
    "grandparent:o": "Grandparent",
    "grandchild:m": "Grandson",
    "grandchild:f": "Granddaughter",
    "grandchild:o": "Grandchild",
    "step_parent:m": "Stepfather",
    "step_parent:f": "Stepmother",
    "step_parent:o": "Step Parent",
    "step_child:m": "Stepson",
    "step_child:f": "Stepdaughter",
    "step_child:o": "Stepchild",
    "adopted_parent:m": "Adoptive Father",
    "adopted_parent:f": "Adoptive Mother",
    "adopted_parent:o": "Adoptive Parent",
    "adopted_child:m": "Adopted Son",
    "adopted_child:f": "Adopted Daughter",
    "adopted_child:o": "Adopted Child",
    "half_sibling:m": "Half Brother",
    "half_sibling:f": "Half Sister",
    "half_sibling:o": "Half Sibling",
    "godparent:m": "Godfather",
    "godparent:f": "Godmother",
    "godparent:o": "Godparent",
    "godchild:m": "Godson",
    "godchild:f": "Goddaughter",
    "godchild:o": "Godchild",
    "close_friend:m": "Close Friend",
    "close_friend:f": "Close Friend",
    "close_friend:o": "Close Friend",
  },

  // ── Multi-hop chain terms ──
  // Key format: "hopType:gender,hopType:gender,..."
  chainTerms: {
    // Direct (1 hop)
    "parent:m": "Father",
    "parent:f": "Mother",
    "parent:o": "Parent",
    "child:m": "Son",
    "child:f": "Daughter",
    "child:o": "Child",
    "spouse:m": "Husband",
    "spouse:f": "Wife",
    "spouse:o": "Spouse",
    "sibling:m": "Brother",
    "sibling:f": "Sister",
    "sibling:o": "Sibling",
    "grandparent:m": "Grandfather",
    "grandparent:f": "Grandmother",
    "grandchild:m": "Grandson",
    "grandchild:f": "Granddaughter",
    "step_parent:m": "Stepfather",
    "step_parent:f": "Stepmother",
    "step_child:m": "Stepson",
    "step_child:f": "Stepdaughter",
    "adopted_parent:m": "Adoptive Father",
    "adopted_parent:f": "Adoptive Mother",
    "adopted_child:m": "Adopted Son",
    "adopted_child:f": "Adopted Daughter",
    "half_sibling:m": "Half Brother",
    "half_sibling:f": "Half Sister",
    "godparent:m": "Godfather",
    "godparent:f": "Godmother",
    "godchild:m": "Godson",
    "godchild:f": "Goddaughter",
    "close_friend:m": "Close Friend",
    "close_friend:f": "Close Friend",

    // Grandparents (2 hops via parent chain)
    "parent:m,parent:m": "Paternal Grandfather",
    "parent:m,parent:f": "Paternal Grandmother",
    "parent:f,parent:m": "Maternal Grandfather",
    "parent:f,parent:f": "Maternal Grandmother",

    // Uncles & Aunts (parent's sibling)
    "parent:m,sibling:m": "Paternal Uncle",
    "parent:m,sibling:f": "Paternal Aunt",
    "parent:f,sibling:m": "Maternal Uncle",
    "parent:f,sibling:f": "Maternal Aunt",

    // Uncle/Aunt spouses
    "parent:m,sibling:m,spouse:f": "Paternal Uncle's Wife",
    "parent:m,sibling:f,spouse:m": "Paternal Aunt's Husband",
    "parent:f,sibling:m,spouse:f": "Maternal Uncle's Wife",
    "parent:f,sibling:f,spouse:m": "Maternal Aunt's Husband",

    // Cousins (parent's sibling's child)
    "parent:m,sibling:m,child:m": "Paternal Cousin (M)",
    "parent:m,sibling:m,child:f": "Paternal Cousin (F)",
    "parent:m,sibling:f,child:m": "Paternal Cousin (M)",
    "parent:m,sibling:f,child:f": "Paternal Cousin (F)",
    "parent:f,sibling:m,child:m": "Maternal Cousin (M)",
    "parent:f,sibling:m,child:f": "Maternal Cousin (F)",
    "parent:f,sibling:f,child:m": "Maternal Cousin (M)",
    "parent:f,sibling:f,child:f": "Maternal Cousin (F)",

    // Niblings (sibling's children)
    "sibling:m,child:m": "Nephew",
    "sibling:m,child:f": "Niece",
    "sibling:f,child:m": "Nephew",
    "sibling:f,child:f": "Niece",

    // Grandchildren (2 hops via child chain)
    "child:m,child:m": "Grandson",
    "child:m,child:f": "Granddaughter",
    "child:f,child:m": "Grandson",
    "child:f,child:f": "Granddaughter",

    // Great-grandparents
    "parent:m,parent:m,parent:m": "Great Grandfather",
    "parent:m,parent:m,parent:f": "Great Grandmother",
    "parent:m,parent:f,parent:m": "Great Grandfather",
    "parent:m,parent:f,parent:f": "Great Grandmother",
    "parent:f,parent:m,parent:m": "Great Grandfather",
    "parent:f,parent:m,parent:f": "Great Grandmother",
    "parent:f,parent:f,parent:m": "Great Grandfather",
    "parent:f,parent:f,parent:f": "Great Grandmother",

    // In-laws (spouse's parent)
    "spouse:m,parent:m": "Father-in-Law",
    "spouse:m,parent:f": "Mother-in-Law",
    "spouse:f,parent:m": "Father-in-Law",
    "spouse:f,parent:f": "Mother-in-Law",

    // Sibling's spouse
    "sibling:m,spouse:f": "Sister-in-Law",
    "sibling:f,spouse:m": "Brother-in-Law",

    // Spouse's sibling
    "spouse:m,sibling:m": "Brother-in-Law",
    "spouse:m,sibling:f": "Sister-in-Law",
    "spouse:f,sibling:m": "Brother-in-Law",
    "spouse:f,sibling:f": "Sister-in-Law",

    // Son/Daughter-in-law
    "child:m,spouse:f": "Daughter-in-Law",
    "child:f,spouse:m": "Son-in-Law",

    // Spouse's sibling's spouse (co-in-laws)
    "spouse:f,sibling:m,spouse:f": "Co-Sister-in-Law",  // Wife's brother's wife
    "spouse:f,sibling:f,spouse:m": "Co-Brother-in-Law", // Wife's sister's husband
    "spouse:m,sibling:m,spouse:f": "Co-Sister-in-Law",  // Husband's brother's wife
    "spouse:m,sibling:f,spouse:m": "Co-Brother-in-Law", // Husband's sister's husband

    // Great-grandchildren
    "child:m,child:m,child:m": "Great Grandson",
    "child:m,child:m,child:f": "Great Granddaughter",
    "child:m,child:f,child:m": "Great Grandson",
    "child:m,child:f,child:f": "Great Granddaughter",
    "child:f,child:m,child:m": "Great Grandson",
    "child:f,child:m,child:f": "Great Granddaughter",
    "child:f,child:f,child:m": "Great Grandson",
    "child:f,child:f,child:f": "Great Granddaughter",

    // Parent's spouse (non-biological)
    "parent:m,spouse:f": "Mother",
    "parent:f,spouse:m": "Father",
  },
};
