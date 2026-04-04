"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, AlertTriangle, Users } from "lucide-react";
import { addFamilyMember } from "@/lib/actions/tree";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { Profile, RelationshipType, Relationship, Gender } from "@/lib/types";
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
  const [isPlaceholder, setIsPlaceholder] = useState(true);
  const [isPrimary, setIsPrimary] = useState(true);
  const [gender, setGender] = useState<Gender | "">("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    birth_date: "",
    death_date: "",
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

    const relType = form.relationship_type;
    const relatedTo = form.related_to;

    // --- Client-side validation ---

    // 0. Gender is required
    if (!gender) {
      setError("Please select a gender for this member.");
      setLoading(false);
      return;
    }

    // 1. Prevent duplicate relationships
    if (
      !isPlaceholder &&
      hasDuplicateRelationship(
        relationships,
        relatedTo,
        currentUser.id,
        relType
      )
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

    // --- Call server action ---
    const result = await addFamilyMember({
      fullName: form.full_name,
      email: form.email || undefined,
      birthDate: form.birth_date || undefined,
      deathDate: form.death_date || undefined,
      location: form.location || undefined,
      gender: gender as Gender,
      relationshipType: relType,
      relatedTo,
      isPlaceholder,
      isPrimary,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
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
            id="death_date"
            label="Date of Passing (if applicable)"
            type="date"
            value={form.death_date}
            onChange={(e) => updateField("death_date", e.target.value)}
          />
          <Input
            id="location"
            label="Location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
          />

          {/* Gender selection (required) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text">
              Gender <span className="text-error">*</span>
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {(
                [
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 px-2 sm:px-3 py-2.5 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all ${
                    gender === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-text-light hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={gender === opt.value}
                    onChange={(e) => {
                      setGender(e.target.value as Gender);
                      setError(null);
                    }}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

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
