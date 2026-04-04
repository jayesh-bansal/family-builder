"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import Avatar from "@/components/ui/Avatar";
import { Ghost } from "lucide-react";
import type { Profile } from "@/lib/types";
import type { ComputedRelation } from "@/lib/variants";

interface MemberNodeData {
  profile: Profile;
  isCurrentUser: boolean;
  relation: ComputedRelation | null;
  myPrefix: string;
  [key: string]: unknown;
}

export default function MemberNode({ data }: NodeProps) {
  const { profile, isCurrentUser, relation, myPrefix } =
    data as MemberNodeData;

  return (
    <div
      className={`px-4 py-3 rounded-2xl border-2 shadow-sm bg-surface min-w-[150px] max-w-[200px] text-center transition-all hover:shadow-md cursor-pointer hover:scale-[1.03] ${
        isCurrentUser
          ? "border-accent shadow-accent/20"
          : profile.is_placeholder
          ? "border-dashed border-text-light/40"
          : "border-border"
      }`}
    >
      {/* Vertical handles (parent above ↔ child below) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-primary !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-primary !w-2 !h-2"
      />

      {/* Horizontal handles (spouse / sibling connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-primary !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-primary !w-2 !h-2"
      />

      <div className="flex flex-col items-center gap-1">
        <Avatar src={profile.avatar_url} name={profile.full_name} size="md" />

        {/* Name */}
        <p className="text-sm font-semibold text-text leading-tight">
          {profile.full_name}
        </p>

        {/* Computed relationship info */}
        {relation && !isCurrentUser && (
          <div className="space-y-0.5">
            {/* Chain description (e.g. "Papa's Behen", "Father's Sister") */}
            {relation.chain && (
              <p className="text-[10px] text-text-light/70 leading-tight">
                {relation.chain}
              </p>
            )}
            {/* Computed term (e.g. "My Bua", "My Paternal Aunt") */}
            <p className="text-xs font-medium text-accent leading-tight">
              {myPrefix} {relation.term}
            </p>
          </div>
        )}

        {/* "Me" label for current user */}
        {isCurrentUser && relation && (
          <p className="text-xs font-medium text-accent">{relation.term}</p>
        )}

        {/* Placeholder indicator */}
        {profile.is_placeholder && (
          <span className="flex items-center gap-1 text-[10px] text-text-light">
            <Ghost className="h-3 w-3" /> Placeholder
          </span>
        )}

        {/* Location */}
        {profile.location && (
          <p className="text-[10px] text-text-light truncate max-w-[160px]">
            {profile.location}
          </p>
        )}
      </div>
    </div>
  );
}
