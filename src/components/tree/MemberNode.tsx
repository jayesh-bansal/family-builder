"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import Avatar from "@/components/ui/Avatar";
import { Ghost } from "lucide-react";
import type { Profile } from "@/lib/types";

interface MemberNodeData {
  profile: Profile;
  isCurrentUser: boolean;
  [key: string]: unknown;
}

export default function MemberNode({ data }: NodeProps) {
  const { profile, isCurrentUser } = data as MemberNodeData;

  return (
    <div
      className={`px-4 py-3 rounded-2xl border-2 shadow-sm bg-surface min-w-[140px] text-center transition-all hover:shadow-md cursor-pointer hover:scale-[1.03] ${
        isCurrentUser
          ? "border-accent shadow-accent/20"
          : profile.is_placeholder
          ? "border-dashed border-text-light/40"
          : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />

      <div className="flex flex-col items-center gap-1.5">
        <Avatar src={profile.avatar_url} name={profile.full_name} size="md" />
        <p className="text-sm font-semibold text-text leading-tight">
          {profile.full_name}
        </p>
        {profile.is_placeholder && (
          <span className="flex items-center gap-1 text-xs text-text-light">
            <Ghost className="h-3 w-3" /> Placeholder
          </span>
        )}
        {profile.location && (
          <p className="text-xs text-text-light">{profile.location}</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}
