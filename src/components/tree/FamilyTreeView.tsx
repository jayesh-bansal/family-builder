"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MemberNode from "./MemberNode";
import AddMemberModal from "./AddMemberModal";
import PathFinderModal from "./PathFinderModal";
import MemberProfileModal from "./MemberProfileModal";
import Button from "@/components/ui/Button";
import { Plus, Route } from "lucide-react";
import type { Profile, Relationship, RelationshipType } from "@/lib/types";

interface FamilyTreeViewProps {
  currentUser: Profile;
  members: Profile[];
  relationships: Relationship[];
}

const nodeTypes = { member: MemberNode };

const EDGE_COLORS: Partial<Record<RelationshipType, string>> = {
  spouse: "#E76F51",
  parent: "#2A9D8F",
  child: "#2A9D8F",
  sibling: "#F4A261",
  grandparent: "#2A9D8F",
  grandchild: "#2A9D8F",
  step_parent: "#264653",
  step_child: "#264653",
  adopted_parent: "#6A4C93",
  adopted_child: "#6A4C93",
  half_sibling: "#F4A261",
  godparent: "#E9C46A",
  godchild: "#E9C46A",
  close_friend: "#8B5E3C",
};

const INVERSE_PAIRS: Record<string, string> = {
  parent: "child",
  child: "parent",
  grandparent: "grandchild",
  grandchild: "grandparent",
  step_parent: "step_child",
  step_child: "step_parent",
  adopted_parent: "adopted_child",
  adopted_child: "adopted_parent",
  godparent: "godchild",
  godchild: "godparent",
};

/**
 * BFS-based layout with concentric rings.
 *
 * Relationship visualization:
 * - Primary relationships → solid lines (the main/closest relationship)
 * - Non-primary relationships → dotted lines (secondary relationships)
 * - Multiple relationships between same pair are shown as separate edges
 * - Bidirectional pairs (A→B "parent" + B→A "child") deduplicated into one
 */
function buildGraph(
  members: Profile[],
  relationships: Relationship[],
  currentUserId: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (members.length === 0) return { nodes, edges };

  // Build adjacency for BFS
  const adjacency = new Map<string, Set<string>>();
  members.forEach((m) => adjacency.set(m.id, new Set()));

  relationships.forEach((r) => {
    adjacency.get(r.person_id)?.add(r.related_person_id);
    adjacency.get(r.related_person_id)?.add(r.person_id);
  });

  // BFS from current user
  const distances = new Map<string, number>();
  const queue: string[] = [currentUserId];
  distances.set(currentUserId, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dist = distances.get(current)!;
    const neighbors = adjacency.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, dist + 1);
        queue.push(neighbor);
      }
    }
  }

  // Handle disconnected members
  members.forEach((m) => {
    if (!distances.has(m.id)) distances.set(m.id, 999);
  });

  // Group by ring
  const rings = new Map<number, string[]>();
  distances.forEach((dist, id) => {
    if (!rings.has(dist)) rings.set(dist, []);
    rings.get(dist)!.push(id);
  });

  const centerX = 400;
  const centerY = 350;
  const ringSpacing = 250;
  const memberMap = new Map(members.map((m) => [m.id, m]));

  rings.forEach((memberIds, ring) => {
    if (ring === 0) {
      const member = memberMap.get(memberIds[0]);
      if (member) {
        nodes.push({
          id: member.id,
          type: "member",
          position: { x: centerX, y: centerY },
          data: { profile: member, isCurrentUser: true },
        });
      }
      return;
    }

    if (ring === 999) return; // skip disconnected

    const radius = ring * ringSpacing;
    const count = memberIds.length;
    const minAngle = Math.min((2 * Math.PI) / count, Math.PI / 2);

    memberIds.forEach((id, i) => {
      const member = memberMap.get(id);
      if (!member) return;

      const angleOffset = ring % 2 === 0 ? 0 : minAngle / 2;
      const angle = minAngle * i + angleOffset - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      nodes.push({
        id: member.id,
        type: "member",
        position: { x, y },
        data: { profile: member, isCurrentUser: false },
      });
    });
  });

  // Build edges — group by canonical pair, then separate primary vs non-primary
  // Step 1: Collect all unique relationship types per pair (deduplicate inverses)
  const pairRelations = new Map<
    string,
    {
      source: string;
      target: string;
      types: {
        type: string;
        isPrimary: boolean;
        color: string;
        confirmed: boolean;
      }[];
    }
  >();

  const processedInverses = new Set<string>();

  relationships.forEach((rel) => {
    const pairKey = [rel.person_id, rel.related_person_id].sort().join("-");
    const relLabel = rel.relationship_type.replace(/_/g, " ");

    // Check if this is the inverse of an already-processed relation
    const inverseKey = `${pairKey}:${INVERSE_PAIRS[rel.relationship_type] || ""}`;
    const forwardKey = `${pairKey}:${rel.relationship_type}`;

    if (processedInverses.has(forwardKey)) return;
    processedInverses.add(forwardKey);

    // Also mark the inverse as processed
    const inverseType = INVERSE_PAIRS[rel.relationship_type];
    if (inverseType) {
      processedInverses.add(`${pairKey}:${inverseType}`);
    }

    if (!pairRelations.has(pairKey)) {
      pairRelations.set(pairKey, {
        source: rel.person_id,
        target: rel.related_person_id,
        types: [],
      });
    }

    const group = pairRelations.get(pairKey)!;
    const color =
      EDGE_COLORS[rel.relationship_type as RelationshipType] || "#A47551";

    // Avoid duplicate labels
    if (!group.types.some((t) => t.type === relLabel)) {
      group.types.push({
        type: relLabel,
        isPrimary: rel.is_primary !== false, // default to primary if not set
        color,
        confirmed: rel.is_confirmed,
      });
    }
  });

  // Step 2: Create edges — primary as solid, non-primary as dotted
  pairRelations.forEach((group, pairKey) => {
    const primaryTypes = group.types.filter((t) => t.isPrimary);
    const secondaryTypes = group.types.filter((t) => !t.isPrimary);

    // Primary edge (solid line)
    if (primaryTypes.length > 0) {
      const label = primaryTypes.map((t) => t.type).join(" + ");
      const color = primaryTypes[0].color;
      const animated = primaryTypes.some((t) => !t.confirmed);

      edges.push({
        id: `${pairKey}-primary`,
        source: group.source,
        target: group.target,
        label,
        style: {
          stroke: color,
          strokeWidth: 2,
        },
        labelStyle: { fontSize: 11, fill: "#6B5B5D", fontWeight: 600 },
        animated,
      });
    }

    // Non-primary edges (dotted lines) — each as a separate edge
    secondaryTypes.forEach((t, i) => {
      edges.push({
        id: `${pairKey}-secondary-${i}`,
        source: group.source,
        target: group.target,
        label: t.type,
        style: {
          stroke: t.color,
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
          opacity: 0.7,
        },
        labelStyle: {
          fontSize: 10,
          fill: "#9B8B8E",
          fontStyle: "italic",
        },
        animated: !t.confirmed,
      });
    });

    // If all relationships are primary (or there's only one), just show solid
    if (primaryTypes.length === 0 && secondaryTypes.length === 0) return;

    // If no explicit primary but there are types, treat the first as primary
    if (primaryTypes.length === 0 && secondaryTypes.length > 0) {
      const first = secondaryTypes[0];
      // Upgrade the first secondary to solid
      const existingEdge = edges.find(
        (e) => e.id === `${pairKey}-secondary-0`
      );
      if (existingEdge) {
        existingEdge.id = `${pairKey}-primary`;
        existingEdge.style = {
          stroke: first.color,
          strokeWidth: 2,
        };
        existingEdge.labelStyle = {
          fontSize: 11,
          fill: "#6B5B5D",
          fontWeight: 600,
        };
      }
    }
  });

  return { nodes, edges };
}

export default function FamilyTreeView({
  currentUser,
  members,
  relationships,
}: FamilyTreeViewProps) {
  const t = useTranslations("tree");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPathFinder, setShowPathFinder] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(members, relationships, currentUser.id),
    [members, relationships, currentUser.id]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-[calc(100dvh-8rem)] relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          {t("addMember")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPathFinder(true)}
        >
          <Route className="h-4 w-4" />
          Discover Path
        </Button>
      </div>

      {/* Member count badge */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-border text-sm text-secondary">
        {members.length} {members.length === 1 ? "member" : "members"}
      </div>

      {/* Legend */}
      <div className="absolute bottom-20 left-4 z-10 bg-white/90 backdrop-blur rounded-xl border border-border p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#2A9D8F]" />
          <span className="text-text-light">Primary relation</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-0.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, #9B8B8E 0, #9B8B8E 4px, transparent 4px, transparent 7px)",
            }}
          />
          <span className="text-text-light">Secondary relation</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedMemberId(node.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        className="bg-background"
        minZoom={0.2}
        maxZoom={2.5}
        panOnScroll={false}
        zoomOnDoubleClick={false}
      >
        <Controls showInteractive={false} className="hidden md:flex" />
        <Background variant={BackgroundVariant.Dots} color="#E8DDD3" gap={20} />
      </ReactFlow>

      {showAddModal && (
        <AddMemberModal
          currentUser={currentUser}
          members={members}
          relationships={relationships}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showPathFinder && (
        <PathFinderModal
          currentUser={currentUser}
          members={members}
          relationships={relationships}
          onClose={() => setShowPathFinder(false)}
        />
      )}

      {selectedMemberId && memberMap.get(selectedMemberId) && (
        <MemberProfileModal
          profile={memberMap.get(selectedMemberId)!}
          relationships={relationships}
          members={members}
          isCurrentUser={selectedMemberId === currentUser.id}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  );
}
