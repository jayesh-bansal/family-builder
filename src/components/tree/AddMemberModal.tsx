"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, AlertTriangle, Users } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Profile, RelationshipType, Relationship } from "@/lib/types";
import { INVERSE_RELATIONSHIP } from "@/lib/types";
import {
  hasDuplicateRelationship,
  hasContradiction,
  computeAutoLinks,
} from "@/lib/relationships";

interface AddMemberModalProps {
  currentUser: Profile;
  members: Profile[];
  relationships: Relationship[];
  onClose: () => void;
}

const relationshipOptions: { value: RelationshipType; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "step_parent", label: "Step Parent" },
  { value: "step_child", label: "Step Child" },
  { value: "adopted_parent", label: "Adoptive Parent" },
  { value: "adopted_child", label: "Adopted Child" },
  { value: "half_sibling", label: "Half Sibling" },
  { value: "godparent", label: "Godparent" },
  { value: "godchild", label: "Godchild" },
  { value: "close_friend", label: "Close Friend" },
];

export default function AddMemberModal({
  currentUser,
  members,
  relationships,
  onClose,
}: AddMemberModalProps) {
  const t = useTranslations("tree");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [isPrimary, setIsPrimary] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    birth_date: "",
    location: "",
    relationship_type: "parent" as RelationshipType,
    related_to: currentUser.id,
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Compute auto-links preview
  const autoLinks = computeAutoLinks(
    relationships,
    form.related_to,
    "__new__", // placeholder ID for preview
    form.relationship_type
  );
  const autoLinkCount = autoLinks.length / 2; // Each auto-link is bidirectional (2 records)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const newMemberId = isPlaceholder ? uuidv4() : currentUser.id;
    const relatedTo = form.related_to;
    const relType = form.relationship_type;
    const targetId = isPlaceholder ? newMemberId : relatedTo;

    // --- Validation ---

    // 1. Prevent duplicate relationships
    if (
      hasDuplicateRelationship(
        relationships,
        relatedTo,
        isPlaceholder ? "__skip__" : currentUser.id,
        relType
      ) &&
      !isPlaceholder
    ) {
      setError(
        `This "${relType.replace("_", " ")}" relationship already exists.`
      );
      setLoading(false);
      return;
    }

    // 2. Prevent contradictory relationships (only for non-placeholder)
    if (!isPlaceholder) {
      const contradiction = hasContradiction(
        relationships,
        relatedTo,
        currentUser.id,
        relType
      );
      if (contradiction) {
        setError(contradiction);
        setLoading(false);
        return;
      }
    }

    // --- Create ---

    if (isPlaceholder) {
      // Create placeholder profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: newMemberId,
        full_name: form.full_name,
        email: form.email || null,
        birth_date: form.birth_date || null,
        location: form.location || null,
        is_placeholder: true,
        created_by: currentUser.id,
      });

      if (profileError) {
        setError("Failed to create member. Please try again.");
        setLoading(false);
        return;
      }

      // Primary bidirectional relationships
      const allInserts = [
        {
          person_id: relatedTo,
          related_person_id: newMemberId,
          relationship_type: relType,
          is_confirmed: true,
          is_primary: isPrimary,
          created_by: currentUser.id,
        },
        {
          person_id: newMemberId,
          related_person_id: relatedTo,
          relationship_type: INVERSE_RELATIONSHIP[relType],
          is_confirmed: true,
          is_primary: isPrimary,
          created_by: currentUser.id,
        },
      ];

      // Auto-link relationships (e.g., parent → siblings, child → spouse)
      const autoLinkInserts = computeAutoLinks(
        relationships,
        relatedTo,
        newMemberId,
        relType
      );
      for (const link of autoLinkInserts) {
        allInserts.push({
          ...link,
          is_confirmed: true,
          is_primary: isPrimary,
          created_by: currentUser.id,
        });
      }

      const { error: relError } = await supabase
        .from("relationships")
        .insert(allInserts);
      if (relError) {
        setError("Failed to create relationships. Please try again.");
        setLoading(false);
        return;
      }
    } else {
      // Non-placeholder: create relationship between existing members
      const allInserts = [
        {
          person_id: relatedTo,
          related_person_id: currentUser.id,
          relationship_type: relType,
          is_confirmed: false,
          is_primary: isPrimary,
          created_by: currentUser.id,
        },
        {
          person_id: currentUser.id,
          related_person_id: relatedTo,
          relationship_type: INVERSE_RELATIONSHIP[relType],
          is_confirmed: false,
          is_primary: isPrimary,
          created_by: currentUser.id,
        },
      ];

      const { error: relError } = await supabase
        .from("relationships")
        .insert(allInserts);
      if (relError) {
        setError("Failed to create relationship. Please try again.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.refresh();
    onClose();
  };

  const relatedToOptions = members.map((m) => ({
    value: m.id,
    label: m.full_name + (m.id === currentUser.id ? " (You)" : ""),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">{t("addMember")}</h2>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="full_name"
            label="Full Name"
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            required
          />
          <Input
            id="email"
            label="Email (optional)"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <Input
            id="birth_date"
            label="Date of Birth"
            type="date"
            value={form.birth_date}
            onChange={(e) => updateField("birth_date", e.target.value)}
          />
          <Input
            id="location"
            label="Location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
          />

          <Select
            id="relationship_type"
            label={t("relationship")}
            value={form.relationship_type}
            onChange={(e) => updateField("relationship_type", e.target.value)}
            options={relationshipOptions}
          />

          <Select
            id="related_to"
            label={t("relatedTo")}
            value={form.related_to}
            onChange={(e) => updateField("related_to", e.target.value)}
            options={relatedToOptions}
          />

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPlaceholder}
                onChange={(e) => setIsPlaceholder(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">{t("placeholder")}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">Primary relationship</span>
              <span className="text-xs text-text-light">
                (solid line on tree)
              </span>
            </label>
          </div>

          {/* Auto-link preview */}
          {isPlaceholder && autoLinkCount > 0 && (
            <div className="flex items-start gap-2 bg-accent/10 text-accent rounded-lg px-3 py-2 text-sm">
              <Users className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Will also auto-link to {autoLinkCount} other family{" "}
                {autoLinkCount === 1 ? "member" : "members"} (siblings, spouse,
                or parents).
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 bg-error/10 text-error rounded-lg px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {t("addMember")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
