"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Route } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Avatar from "@/components/ui/Avatar";
import type { Profile, Relationship } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/types";

interface PathFinderModalProps {
  currentUser: Profile;
  members: Profile[];
  relationships: Relationship[];
  onClose: () => void;
}

interface PathStep {
  person: Profile;
  relationship: string;
}

// BFS to find shortest path between two people
function findPath(
  fromId: string,
  toId: string,
  relationships: Relationship[],
  members: Profile[]
): PathStep[] | null {
  if (fromId === toId) return [];

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const adjacency = new Map<string, { personId: string; type: string }[]>();

  relationships.forEach((rel) => {
    if (!adjacency.has(rel.person_id)) adjacency.set(rel.person_id, []);
    if (!adjacency.has(rel.related_person_id))
      adjacency.set(rel.related_person_id, []);

    adjacency
      .get(rel.person_id)!
      .push({ personId: rel.related_person_id, type: rel.relationship_type });
    adjacency
      .get(rel.related_person_id)!
      .push({ personId: rel.person_id, type: rel.relationship_type });
  });

  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: PathStep[] }[] = [
    { id: fromId, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current.id) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.personId)) continue;
      visited.add(neighbor.personId);

      const person = memberMap.get(neighbor.personId);
      if (!person) continue;

      const newPath = [
        ...current.path,
        { person, relationship: neighbor.type },
      ];

      if (neighbor.personId === toId) return newPath;
      queue.push({ id: neighbor.personId, path: newPath });
    }
  }

  return null;
}

export default function PathFinderModal({
  currentUser,
  members,
  relationships,
  onClose,
}: PathFinderModalProps) {
  const t = useTranslations("tree");
  const [targetId, setTargetId] = useState("");
  const [path, setPath] = useState<PathStep[] | null | undefined>(undefined);

  const otherMembers = members.filter((m) => m.id !== currentUser.id);
  const memberOptions = [
    { value: "", label: "Select a person..." },
    ...otherMembers.map((m) => ({ value: m.id, label: m.full_name })),
  ];

  const handleFind = () => {
    if (!targetId) return;
    const result = findPath(currentUser.id, targetId, relationships, members);
    setPath(result);
  };

  const targetName =
    members.find((m) => m.id === targetId)?.full_name || "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Route className="h-5 w-5 text-accent" />
            Discover Path
          </h2>
          <button onClick={onClose} className="text-text-light hover:text-text cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Select
            id="target"
            label="Find connection to..."
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setPath(undefined);
            }}
            options={memberOptions}
          />

          <Button onClick={handleFind} disabled={!targetId} className="w-full">
            Find Path
          </Button>

          {/* Results */}
          {path === null && (
            <p className="text-center text-text-light py-4">
              {t("noPath", { name: targetName })}
            </p>
          )}

          {path && path.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-accent font-medium">
                {t("pathResult", {
                  name: targetName,
                  steps: path.length,
                })}
              </p>

              {/* Visual path */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-xl">
                  <Avatar
                    src={currentUser.avatar_url}
                    name={currentUser.full_name}
                    size="sm"
                  />
                  <span className="font-medium text-sm">
                    {currentUser.full_name} (You)
                  </span>
                </div>

                {path.map((step, i) => (
                  <div key={i}>
                    <div className="text-center text-xs text-text-light py-1">
                      ↓{" "}
                      {RELATIONSHIP_LABELS[
                        step.relationship as keyof typeof RELATIONSHIP_LABELS
                      ] || step.relationship}
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                        i === path.length - 1
                          ? "bg-secondary/10"
                          : "bg-background"
                      }`}
                    >
                      <Avatar
                        src={step.person.avatar_url}
                        name={step.person.full_name}
                        size="sm"
                      />
                      <span className="font-medium text-sm">
                        {step.person.full_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {path && path.length === 0 && (
            <p className="text-center text-accent font-medium py-4">
              That&apos;s you!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
