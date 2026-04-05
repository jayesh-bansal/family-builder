"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Ghost,
  Pencil,
  Trash2,
  Users,
  User,
  Globe,
  ExternalLink,
  Cake,
  LinkIcon,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import type { Profile, Relationship, SocialLinks, RelationshipType } from "@/lib/types";
import { getRelationshipLabel, getRelationshipOptions, type FamilyVariant } from "@/lib/variants";
import { requestSecondaryRelation, setMemberAlias } from "@/lib/actions/tree";

interface MemberProfileModalProps {
  profile: Profile;
  relationships: Relationship[];
  members: Profile[];
  currentUserId: string;
  isCurrentUser: boolean;
  familyVariant?: FamilyVariant;
  onClose: () => void;
  onEdit?: (member: Profile) => void;
}

const SOCIAL_CONFIG: Record<
  keyof SocialLinks,
  { color: string; baseUrl: string; label: string }
> = {
  instagram: { color: "#E1306C", baseUrl: "https://instagram.com/", label: "Instagram" },
  facebook: { color: "#1877F2", baseUrl: "https://facebook.com/", label: "Facebook" },
  twitter: { color: "#000000", baseUrl: "https://x.com/", label: "X" },
  linkedin: { color: "#0A66C2", baseUrl: "https://linkedin.com/in/", label: "LinkedIn" },
  youtube: { color: "#FF0000", baseUrl: "https://youtube.com/", label: "YouTube" },
  snapchat: { color: "#FFFC00", baseUrl: "https://snapchat.com/add/", label: "Snapchat" },
};

function getSocialUrl(key: keyof SocialLinks, value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return SOCIAL_CONFIG[key].baseUrl + value.replace(/^@/, "");
}

/**
 * Mini calendar showing a specific month with the birthday highlighted.
 */
function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function safeDate(y: number, m: number, d: number) {
  // Handle Feb 29 in non-leap years → use Feb 28
  if (m === 1 && d === 29 && !isLeapYear(y)) return new Date(y, 1, 28);
  return new Date(y, m, d);
}

function BirthdayMiniCalendar({ birthDate }: { birthDate: string }) {
  const date = new Date(birthDate + "T00:00:00");
  const month = date.getMonth();
  const year = date.getFullYear();
  const day = date.getDate();
  const today = new Date();

  const monthName = date.toLocaleDateString("en", { month: "long" });

  // First day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Check if birthday is upcoming this year (use safe date for leap years)
  const thisYearBirthday = safeDate(today.getFullYear(), month, day);
  const isUpcoming =
    thisYearBirthday >= today &&
    thisYearBirthday.getTime() - today.getTime() < 60 * 24 * 60 * 60 * 1000;

  const age = today.getFullYear() - year;

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Cake className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-primary">Birthday</span>
        </div>
        {isUpcoming && (
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
            Coming up!
          </span>
        )}
      </div>

      {/* Month header */}
      <p className="text-xs text-center text-text-light mb-1.5">
        {monthName} {year}
        {age > 0 && (
          <span className="ml-1 text-text-light/60">
            (turns {thisYearBirthday >= today ? age : age + 1})
          </span>
        )}
      </p>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-text-light/60"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-6" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const isBirthday = d === day;
          const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
              key={d}
              className={`h-6 flex items-center justify-center text-[11px] rounded-md transition-colors ${
                isBirthday
                  ? "bg-accent text-white font-bold ring-2 ring-accent/30"
                  : isToday
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-light"
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MemberProfileModal({
  profile,
  relationships,
  members,
  currentUserId,
  isCurrentUser,
  familyVariant = "global",
  onClose,
  onEdit,
}: MemberProfileModalProps) {
  const locale = useLocale();
  const router = useRouter();
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationSuccess, setRelationSuccess] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<RelationshipType>("sibling");
  const relOptions = getRelationshipOptions(familyVariant);

  // Alias state — find current alias from the relationship where currentUser → this member
  const myRelToThis = relationships.find(
    (r) => r.person_id === currentUserId && r.related_person_id === profile.id
  );
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState((myRelToThis as any)?.display_alias || "");
  const [aliasSaving, setAliasSaving] = useState(false);

  // Find this person's direct relationships
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const directRelations = relationships
    .filter((r) => r.person_id === profile.id)
    .map((r) => ({
      person: memberMap.get(r.related_person_id),
      type: r.relationship_type,
      isPrimary: r.is_primary !== false,
    }))
    .filter((r) => r.person);

  const formatDate = (dateStr: string | null, isDateOnly = false) => {
    if (!dateStr) return null;
    try {
      // Date-only strings (YYYY-MM-DD) need T00:00:00 to avoid timezone shift
      // Timestamps (from created_at etc.) already include time info
      const date = isDateOnly
        ? new Date(dateStr + "T00:00:00")
        : new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Collect non-empty social links
  const socialEntries = profile.social_links
    ? (Object.entries(profile.social_links) as [keyof SocialLinks, string][])
        .filter(([, value]) => value && value.trim())
    : [];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-primary">Profile</h2>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text cursor-pointer p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center gap-3">
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name}
              size="xl"
            />
            <div>
              <h3 className="text-xl font-bold text-primary">
                {profile.full_name}
              </h3>
              {/* Alias (personal nickname) — only for non-self members with a relationship */}
              {!isCurrentUser && myRelToThis && (
                <div className="mt-1">
                  {editingAlias ? (
                    <div className="flex items-center gap-1.5 justify-center">
                      <input
                        type="text"
                        value={aliasValue}
                        onChange={(e) => setAliasValue(e.target.value)}
                        placeholder="Set a nickname..."
                        className="text-xs px-2 py-1 rounded-lg border border-border bg-background text-text w-32 text-center outline-none focus:border-accent"
                        autoFocus
                      />
                      <button
                        disabled={aliasSaving}
                        onClick={async () => {
                          setAliasSaving(true);
                          await setMemberAlias(profile.id, aliasValue);
                          setAliasSaving(false);
                          setEditingAlias(false);
                          router.refresh();
                        }}
                        className="text-xs text-accent hover:text-accent-light cursor-pointer disabled:opacity-50"
                      >
                        {aliasSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => { setEditingAlias(false); setAliasValue((myRelToThis as any)?.display_alias || ""); }}
                        className="text-xs text-text-light hover:text-text cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingAlias(true)}
                      className="text-xs text-text-light hover:text-accent cursor-pointer transition-colors"
                    >
                      {(myRelToThis as any)?.display_alias
                        ? <span>Alias: <span className="font-medium text-secondary">{(myRelToThis as any).display_alias}</span> <Pencil className="h-3 w-3 inline ml-0.5" /></span>
                        : <span className="italic">Set a nickname <Pencil className="h-3 w-3 inline ml-0.5" /></span>
                      }
                    </button>
                  )}
                </div>
              )}
              {profile.is_placeholder && (
                <span className="inline-flex items-center gap-1 text-xs text-text-light bg-muted px-2 py-0.5 rounded-full mt-1">
                  <Ghost className="h-3 w-3" /> Placeholder
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-secondary text-center italic">
              {profile.bio}
            </p>
          )}

          {/* Social Links */}
          {socialEntries.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {socialEntries.map(([key, value]) => {
                const config = SOCIAL_CONFIG[key];
                if (!config) return null;
                return (
                  <a
                    key={key}
                    href={getSocialUrl(key, value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-medium hover:shadow-sm transition-all hover:scale-105"
                    style={{ color: config.color }}
                    title={`${config.label}: ${value}`}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span>{config.label}</span>
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Info fields — hidden if member set visibility to private (unless it's yourself or a placeholder) */}
          {(isCurrentUser || profile.is_placeholder || profile.tree_visibility !== "private") ? (
            <div className="space-y-3">
              {profile.gender && (
                <div className="flex items-center gap-3 text-sm min-w-0">
                  <User className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-text capitalize">{profile.gender}</span>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-3 text-sm min-w-0">
                  <Mail className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-text truncate">{profile.email}</span>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center gap-3 text-sm min-w-0">
                  <Phone className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-text truncate">{profile.phone}</span>
                </div>
              )}

              {profile.location && (
                <div className="flex items-center gap-3 text-sm min-w-0">
                  <MapPin className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-text truncate">{profile.location}</span>
                </div>
              )}

              {profile.birth_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-text">
                    {formatDate(profile.birth_date, true)}
                  </span>
                </div>
              )}

              {profile.death_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-text-light shrink-0" />
                  <span className="text-text-light">
                    Passed: {formatDate(profile.death_date, true)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-light italic text-center">
              This member has set their profile to private.
            </p>
          )}

          {/* Birthday Calendar */}
          {profile.birth_date && (isCurrentUser || profile.is_placeholder || profile.tree_visibility !== "private") && (
            <BirthdayMiniCalendar birthDate={profile.birth_date} />
          )}

          {/* Relationships */}
          {directRelations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-accent" />
                <h4 className="text-sm font-semibold text-primary">
                  Relationships
                </h4>
              </div>
              <div className="space-y-2">
                {directRelations.map((rel, i) => {
                  const label = getRelationshipLabel(
                    rel.type,
                    rel.person!.gender,
                    familyVariant
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background border border-border"
                    >
                      <Avatar
                        src={rel.person!.avatar_url}
                        name={rel.person!.full_name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {rel.person!.full_name}
                        </p>
                        <p className="text-xs text-text-light">
                          {label}
                          {!rel.isPrimary && (
                            <span className="ml-1 text-text-light/60 italic">
                              (secondary)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add secondary relation — only for non-placeholder, non-self members */}
          {!isCurrentUser && !profile.is_placeholder && (
            <div>
              {!showAddRelation && !relationSuccess ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAddRelation(true)}
                >
                  <LinkIcon className="h-4 w-4" />
                  Add Relation
                </Button>
              ) : relationSuccess ? (
                <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  Relation request sent!
                </div>
              ) : (
                <div className="space-y-2 border border-border rounded-xl p-3">
                  <p className="text-xs font-medium text-text-light">Request a relation</p>
                  <Select
                    id="sec_rel_type"
                    label=""
                    value={selectedRelType}
                    onChange={(e) => setSelectedRelType(e.target.value as RelationshipType)}
                    options={relOptions}
                  />
                  {relationError && (
                    <p className="text-xs text-error">{relationError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowAddRelation(false); setRelationError(null); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={relationLoading}
                      onClick={async () => {
                        setRelationLoading(true);
                        setRelationError(null);
                        const result = await requestSecondaryRelation(profile.id, selectedRelType);
                        setRelationLoading(false);
                        if (result.error) {
                          setRelationError(result.error);
                        } else {
                          setRelationSuccess(true);
                          setTimeout(() => router.refresh(), 1000);
                        }
                      }}
                    >
                      Send Request
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Member since */}
          <p className="text-xs text-text-light text-center">
            Member since {formatDate(profile.created_at)}
          </p>

          {/* Edit button for placeholder members — only visible to creator */}
          {profile.is_placeholder && onEdit && profile.created_by === currentUserId && (
            <Button
              onClick={() => {
                onClose();
                onEdit(profile);
              }}
              variant="outline"
              className="w-full"
            >
              <Pencil className="h-4 w-4" />
              Edit Member
            </Button>
          )}

          {/* Edit button for current user */}
          {isCurrentUser && (
            <Button
              onClick={() => {
                onClose();
                router.push(`/${locale}/profile`);
              }}
              variant="outline"
              className="w-full"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
