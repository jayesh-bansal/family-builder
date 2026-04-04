import type { VariantConfig } from "./types";

/**
 * Indian variant — Hindi/Indian relationship labels.
 *
 * Indian family relationships are highly specific compared to English.
 * For example, English has one word "Uncle" but Hindi distinguishes:
 * - Chacha (father's younger brother)
 * - Tau (father's elder brother)
 * - Mama (mother's brother)
 * - Fufa (father's sister's husband)
 * - Mausa (mother's sister's husband)
 *
 * Note: We use Chacha as the default for father's brother since
 * elder/younger distinction would require birth order tracking.
 */
export const INDIAN_VARIANT: VariantConfig = {
  name: "Indian (Hindi)",
  selfLabel: "Main",
  myPrefix: "My",

  // ── Single-hop labels (for building chain descriptions) ──
  hopLabels: {
    // Core
    "parent:m": "Papa",
    "parent:f": "Mummy",
    "parent:o": "Parent",
    "child:m": "Beta",
    "child:f": "Beti",
    "child:o": "Child",
    "spouse:m": "Pati",
    "spouse:f": "Patni",
    "spouse:o": "Spouse",
    "sibling:m": "Bhai",
    "sibling:f": "Behen",
    "sibling:o": "Sibling",

    // Extended
    "grandparent:m": "Dada/Nana",
    "grandparent:f": "Dadi/Nani",
    "grandparent:o": "Grandparent",
    "grandchild:m": "Pota/Nawasa",
    "grandchild:f": "Poti/Nawasi",
    "grandchild:o": "Grandchild",
    "step_parent:m": "Sautele Papa",
    "step_parent:f": "Sauteli Mummy",
    "step_parent:o": "Step Parent",
    "step_child:m": "Sautela Beta",
    "step_child:f": "Sauteli Beti",
    "step_child:o": "Stepchild",
    "adopted_parent:m": "God Liye Papa",
    "adopted_parent:f": "God Liye Mummy",
    "adopted_parent:o": "Adoptive Parent",
    "adopted_child:m": "God Liya Beta",
    "adopted_child:f": "God Liyi Beti",
    "adopted_child:o": "Adopted Child",
    "half_sibling:m": "Sautela Bhai",
    "half_sibling:f": "Sauteli Behen",
    "half_sibling:o": "Half Sibling",
    "godparent:m": "Dharma Papa",
    "godparent:f": "Dharma Mummy",
    "godparent:o": "Godparent",
    "godchild:m": "Dharma Beta",
    "godchild:f": "Dharma Beti",
    "godchild:o": "Godchild",
    "close_friend:m": "Kareeb Dost",
    "close_friend:f": "Kareeb Dost",
    "close_friend:o": "Kareeb Dost",
  },

  // ── Multi-hop chain terms ──
  chainTerms: {
    // ─── Direct (1 hop) ───
    "parent:m": "Papa",
    "parent:f": "Mummy",
    "parent:o": "Parent",
    "child:m": "Beta",
    "child:f": "Beti",
    "child:o": "Child",
    "spouse:m": "Pati",
    "spouse:f": "Patni",
    "spouse:o": "Spouse",
    "sibling:m": "Bhai",
    "sibling:f": "Behen",
    "sibling:o": "Sibling",
    "grandparent:m": "Dada/Nana",
    "grandparent:f": "Dadi/Nani",
    "grandchild:m": "Pota/Nawasa",
    "grandchild:f": "Poti/Nawasi",
    "step_parent:m": "Sautele Papa",
    "step_parent:f": "Sauteli Mummy",
    "step_child:m": "Sautela Beta",
    "step_child:f": "Sauteli Beti",
    "adopted_parent:m": "God Liye Papa",
    "adopted_parent:f": "God Liye Mummy",
    "adopted_child:m": "God Liya Beta",
    "adopted_child:f": "God Liyi Beti",
    "half_sibling:m": "Sautela Bhai",
    "half_sibling:f": "Sauteli Behen",
    "godparent:m": "Dharma Papa",
    "godparent:f": "Dharma Mummy",
    "godchild:m": "Dharma Beta",
    "godchild:f": "Dharma Beti",
    "close_friend:m": "Kareeb Dost",
    "close_friend:f": "Kareeb Dost",

    // ─── Paternal Grandparents ───
    "parent:m,parent:m": "Dada",
    "parent:m,parent:f": "Dadi",

    // ─── Maternal Grandparents ───
    "parent:f,parent:m": "Nana",
    "parent:f,parent:f": "Nani",

    // ─── Paternal Uncles & Aunts ───
    "parent:m,sibling:m": "Chacha",       // Father's brother
    "parent:m,sibling:f": "Bua",          // Father's sister (Bhuaji)

    // ─── Maternal Uncles & Aunts ───
    "parent:f,sibling:m": "Mama",          // Mother's brother
    "parent:f,sibling:f": "Mausi",         // Mother's sister

    // ─── Spouses of Uncles/Aunts ───
    "parent:m,sibling:m,spouse:f": "Chachi",    // Chacha's wife
    "parent:m,sibling:f,spouse:m": "Fufa",      // Bua's husband (Fufaji)
    "parent:f,sibling:m,spouse:f": "Mami",      // Mama's wife
    "parent:f,sibling:f,spouse:m": "Mausa",     // Mausi's husband (Mausaji)

    // ─── Cousins ───
    // Chacha's children
    "parent:m,sibling:m,child:m": "Chacha ka Beta",
    "parent:m,sibling:m,child:f": "Chacha ki Beti",
    // Bua's children
    "parent:m,sibling:f,child:m": "Bua ka Beta",
    "parent:m,sibling:f,child:f": "Bua ki Beti",
    // Mama's children
    "parent:f,sibling:m,child:m": "Mama ka Beta",
    "parent:f,sibling:m,child:f": "Mama ki Beti",
    // Mausi's children
    "parent:f,sibling:f,child:m": "Mausi ka Beta",
    "parent:f,sibling:f,child:f": "Mausi ki Beti",

    // ─── Niblings (sibling's children) ───
    "sibling:m,child:m": "Bhatija",       // Brother's son
    "sibling:m,child:f": "Bhatiji",       // Brother's daughter
    "sibling:f,child:m": "Bhanja",        // Sister's son
    "sibling:f,child:f": "Bhanji",        // Sister's daughter

    // ─── Grandchildren ───
    "child:m,child:m": "Pota",            // Son's son
    "child:m,child:f": "Poti",            // Son's daughter
    "child:f,child:m": "Nawasa",          // Daughter's son (Dohtaa)
    "child:f,child:f": "Nawasi",          // Daughter's daughter (Dohtii)

    // ─── Great-grandparents ───
    "parent:m,parent:m,parent:m": "Par Dada",
    "parent:m,parent:m,parent:f": "Par Dadi",
    "parent:f,parent:f,parent:m": "Par Nana",
    "parent:f,parent:f,parent:f": "Par Nani",
    "parent:m,parent:f,parent:m": "Par Nana",
    "parent:m,parent:f,parent:f": "Par Nani",
    "parent:f,parent:m,parent:m": "Par Dada",
    "parent:f,parent:m,parent:f": "Par Dadi",

    // ─── In-laws (Sasural) ───
    "spouse:m,parent:m": "Sasur",          // Father-in-law (husband's father)
    "spouse:m,parent:f": "Saas",           // Mother-in-law (husband's mother)
    "spouse:f,parent:m": "Sasur",          // Father-in-law (wife's father)
    "spouse:f,parent:f": "Saas",           // Mother-in-law (wife's mother)

    // ─── Sibling's spouse ───
    "sibling:m,spouse:f": "Bhabhi",        // Brother's wife
    "sibling:f,spouse:m": "Jija",          // Sister's husband (Jijaji)

    // ─── Spouse's sibling ───
    "spouse:m,sibling:m": "Devar/Jeth",    // Husband's brother
    "spouse:m,sibling:f": "Nanad",         // Husband's sister
    "spouse:f,sibling:m": "Saala",         // Wife's brother
    "spouse:f,sibling:f": "Saali",         // Wife's sister

    // ─── Son/Daughter-in-law ───
    "child:m,spouse:f": "Bahu",            // Son's wife
    "child:f,spouse:m": "Damad",           // Daughter's husband

    // ─── Parent's spouse (for step situations) ───
    "parent:m,spouse:f": "Mummy",
    "parent:f,spouse:m": "Papa",
  },
};
