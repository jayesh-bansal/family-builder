"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  AlertTriangle,
  Trash2,
  Camera,
  Loader2,
} from "lucide-react";
import {
  editFamilyMember,
  deleteFamilyMember,
  uploadMemberAvatar,
} from "@/lib/actions/tree";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import type { Profile, Gender } from "@/lib/types";

interface EditMemberModalProps {
  member: Profile;
  onClose: () => void;
}

export default function EditMemberModal({
  member,
  onClose,
}: EditMemberModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    member.avatar_url
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gender, setGender] = useState<Gender | "">(member.gender || "");
  const [form, setForm] = useState({
    full_name: member.full_name,
    email: member.email || "",
    birth_date: member.birth_date || "",
    death_date: member.death_date || "",
    location: member.location || "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setSelectedFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      // Upload avatar first if a new file was selected
      let avatarUrl = member.avatar_url || undefined;
      if (selectedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("avatar", selectedFile);
        const uploadResult = await uploadMemberAvatar(member.id, formData);
        setUploading(false);

        if (uploadResult.error) {
          setError(uploadResult.error);
          setLoading(false);
          return;
        }
        avatarUrl = uploadResult.url;
      }

      // Update profile
      const result = await editFamilyMember({
        memberId: member.id,
        fullName: form.full_name,
        email: form.email || undefined,
        birthDate: form.birth_date || undefined,
        deathDate: form.death_date || undefined,
        location: form.location || undefined,
        gender: gender ? (gender as Gender) : undefined,
        avatarUrl,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);

    const result = await deleteFamilyMember(member.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.refresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-primary">Edit Member</h2>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text cursor-pointer p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar
                src={avatarPreview}
                name={form.full_name || member.full_name}
                size="xl"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
            >
              {avatarPreview ? "Change Photo" : "Upload Photo"}
            </button>
          </div>

          <Input
            id="edit_full_name"
            label="Full Name"
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            required
          />
          <Input
            id="edit_email"
            label="Email (optional)"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <Input
            id="edit_birth_date"
            label="Date of Birth"
            type="date"
            value={form.birth_date}
            onChange={(e) => updateField("birth_date", e.target.value)}
          />
          <Input
            id="edit_death_date"
            label="Date of Passing (if applicable)"
            type="date"
            value={form.death_date}
            onChange={(e) => updateField("death_date", e.target.value)}
          />
          <Input
            id="edit_location"
            label="Location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
          />

          {/* Gender selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text">Gender</label>
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
                    name="edit_gender"
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

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 bg-error/10 text-error rounded-lg px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
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
              {uploading ? "Uploading..." : "Save Changes"}
            </Button>
          </div>

          {/* Delete section */}
          <div className="border-t border-border pt-4 mt-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-error hover:text-error/80 transition-colors cursor-pointer w-full justify-center"
              >
                <Trash2 className="h-4 w-4" />
                Delete this member
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-error text-center">
                  This will permanently remove{" "}
                  <strong>{member.full_name}</strong> and all their
                  relationships. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1"
                  >
                    Keep
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={deleting}
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
