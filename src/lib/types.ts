export type RelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "step_parent"
  | "step_child"
  | "adopted_parent"
  | "adopted_child"
  | "half_sibling"
  | "godparent"
  | "godchild"
  | "close_friend";

export type TreeVisibility = "public" | "family_only" | "private";

export type Gender = "male" | "female" | "other";

export type FamilyVariant = "global" | "indian";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export type NotificationType =
  | "invite"
  | "tree_linked"
  | "member_joined"
  | "info_updated";

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  snapchat?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  birth_date: string | null;
  death_date: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  social_links: SocialLinks | null;
  gender: Gender | null;
  is_placeholder: boolean;
  created_by: string | null;
  tree_visibility: TreeVisibility;
  family_variant: FamilyVariant;
  language_preference: string;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
  is_confirmed: boolean;
  is_primary: boolean;
  created_by: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  token: string;
  inviter_id: string;
  placeholder_id: string | null;
  email: string;
  relationship_type: RelationshipType;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent: "Parent",
  child: "Child",
  spouse: "Spouse",
  sibling: "Sibling",
  grandparent: "Grandparent",
  grandchild: "Grandchild",
  step_parent: "Step Parent",
  step_child: "Step Child",
  adopted_parent: "Adoptive Parent",
  adopted_child: "Adopted Child",
  half_sibling: "Half Sibling",
  godparent: "Godparent",
  godchild: "Godchild",
  close_friend: "Close Friend",
};

export const INVERSE_RELATIONSHIP: Record<RelationshipType, RelationshipType> =
  {
    parent: "child",
    child: "parent",
    spouse: "spouse",
    sibling: "sibling",
    grandparent: "grandchild",
    grandchild: "grandparent",
    step_parent: "step_child",
    step_child: "step_parent",
    adopted_parent: "adopted_child",
    adopted_child: "adopted_parent",
    half_sibling: "half_sibling",
    godparent: "godchild",
    godchild: "godparent",
    close_friend: "close_friend",
  };
