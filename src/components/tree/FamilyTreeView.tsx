"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import MemberNode from "./MemberNode";
import AddMemberModal from "./AddMemberModal";
import PathFinderModal from "./PathFinderModal";
import MemberProfileModal from "./MemberProfileModal";
import EditMemberModal from "./EditMemberModal";
import Button from "@/components/ui/Button";
import { Plus, Route, Search, X } from "lucide-react";
import type { Profile, Relationship, RelationshipType } from "@/lib/types";
import { computeAllRelations, getVariantConfig } from "@/lib/variants";
import type { ComputedRelation, FamilyVariant } from "@/lib/variants";
import { cacheTreeData } from "@/lib/offlineCache";

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

/** Inverse pairs for deduplication */
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
 * Level delta when traversing from person_id to related_person_id.
 *
 * The relationship_type describes what related_person_id IS to person_id.
 * E.g., type="parent" → related_person IS person's parent → related is ABOVE → delta = -1
 *
 * Negative = above (older generation), Positive = below (younger generation), 0 = same level.
 */
const LEVEL_DELTA: Record<string, number> = {
  parent: -1,
  child: 1,
  spouse: 0,
  sibling: 0,
  grandparent: -2,
  grandchild: 2,
  step_parent: -1,
  step_child: 1,
  adopted_parent: -1,
  adopted_child: 1,
  half_sibling: 0,
  godparent: -1,
  godchild: 1,
  close_friend: 0,
};

/**
 * Edge labels — maps both directions of a relationship pair to a single label.
 * E.g., both "parent" and "child" map to "Parent" since the hierarchy makes direction clear.
 */
const EDGE_LABELS: Record<string, string> = {
  parent: "Parent",
  child: "Parent",
  spouse: "Spouse",
  sibling: "Sibling",
  grandparent: "Grandparent",
  grandchild: "Grandparent",
  step_parent: "Step Parent",
  step_child: "Step Parent",
  adopted_parent: "Adoptive Parent",
  adopted_child: "Adoptive Parent",
  half_sibling: "Half Sibling",
  godparent: "Godparent",
  godchild: "Godparent",
  close_friend: "Close Friend",
};

/**
 * Hierarchical tree layout algorithm.
 *
 * 1. BFS from current user, assigning generational levels based on relationship types
 * 2. Parents go above (level -1), children below (level +1), spouses/siblings same level
 * 3. Spouses are placed adjacent to each other
 * 4. Edges use directional handles (top/bottom for vertical, left/right for horizontal)
 * 5. Parent→child edges have arrow markers for clear direction
 */
function buildGraph(
  members: Profile[],
  relationships: Relationship[],
  currentUserId: string,
  relations: Map<string, ComputedRelation>,
  myPrefix: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (members.length === 0) return { nodes, edges };

  const memberMap = new Map(members.map((m) => [m.id, m]));

  // ── Step 1: Build adjacency with level deltas ──
  const adjacency = new Map<
    string,
    { neighbor: string; delta: number }[]
  >();

  for (const rel of relationships) {
    const delta = LEVEL_DELTA[rel.relationship_type] ?? 0;
    if (!adjacency.has(rel.person_id))
      adjacency.set(rel.person_id, []);
    adjacency.get(rel.person_id)!.push({
      neighbor: rel.related_person_id,
      delta,
    });
  }

  // ── Step 2: BFS from current user to assign generational levels ──
  const levels = new Map<string, number>();
  levels.set(currentUserId, 0);
  const queue: string[] = [currentUserId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current)!;

    for (const { neighbor, delta } of adjacency.get(current) || []) {
      if (!levels.has(neighbor)) {
        levels.set(neighbor, currentLevel + delta);
        queue.push(neighbor);
      }
    }
  }

  // Handle disconnected members (no path from current user)
  members.forEach((m) => {
    if (!levels.has(m.id)) levels.set(m.id, 999);
  });

  // ── Step 3: Group by level and order spouses adjacent ──
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (level === 999) return; // skip disconnected
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });

  // Find spouse pairs for adjacency ordering
  const spouseOf = new Map<string, string[]>();
  const seenSpousePairs = new Set<string>();
  for (const rel of relationships) {
    if (rel.relationship_type === "spouse") {
      const key = [rel.person_id, rel.related_person_id].sort().join("-");
      if (!seenSpousePairs.has(key)) {
        seenSpousePairs.add(key);
        if (!spouseOf.has(rel.person_id))
          spouseOf.set(rel.person_id, []);
        if (!spouseOf.has(rel.related_person_id))
          spouseOf.set(rel.related_person_id, []);
        spouseOf.get(rel.person_id)!.push(rel.related_person_id);
        spouseOf.get(rel.related_person_id)!.push(rel.person_id);
      }
    }
  }

  // Reorder within each level: keep spouses next to each other
  for (const [level, ids] of levelGroups) {
    const ordered: string[] = [];
    const placed = new Set<string>();

    for (const id of ids) {
      if (placed.has(id)) continue;
      ordered.push(id);
      placed.add(id);

      // Place spouses right after their partner
      for (const spouseId of spouseOf.get(id) || []) {
        if (ids.includes(spouseId) && !placed.has(spouseId)) {
          ordered.push(spouseId);
          placed.add(spouseId);
        }
      }
    }

    levelGroups.set(level, ordered);
  }

  // ── Step 4: Position nodes ──
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  const nodeWidth = 180;
  const horizontalGap = 60;
  const verticalGap = 220;

  // Find widest level to center everything
  let maxLevelWidth = 0;
  for (const [, ids] of levelGroups) {
    const width = ids.length * (nodeWidth + horizontalGap) - horizontalGap;
    maxLevelWidth = Math.max(maxLevelWidth, width);
  }

  const centerX = maxLevelWidth / 2;
  const positionMap = new Map<string, { x: number; y: number }>();

  for (let li = 0; li < sortedLevels.length; li++) {
    const level = sortedLevels[li];
    const ids = levelGroups.get(level)!;
    const levelWidth =
      ids.length * (nodeWidth + horizontalGap) - horizontalGap;
    const startX = centerX - levelWidth / 2;

    for (let i = 0; i < ids.length; i++) {
      const x = startX + i * (nodeWidth + horizontalGap);
      const y = li * verticalGap;
      positionMap.set(ids[i], { x, y });
    }
  }

  // ── Step 5: Create nodes ──
  for (const [id, pos] of positionMap) {
    const member = memberMap.get(id);
    if (!member) continue;

    nodes.push({
      id: member.id,
      type: "member",
      position: pos,
      data: {
        profile: member,
        isCurrentUser: member.id === currentUserId,
        relation: relations.get(member.id) || null,
        myPrefix,
      },
    });
  }

  // ── Step 6: Create edges (deduplicate inverse pairs) ──
  const processedPairs = new Set<string>();

  for (const rel of relationships) {
    const pairKey = [rel.person_id, rel.related_person_id].sort().join("-");
    const relType = rel.relationship_type;
    const inverseType = INVERSE_PAIRS[relType];

    // Skip if this type or its inverse was already processed for this pair
    const typeKey = `${pairKey}:${relType}`;
    const inverseTypeKey = inverseType ? `${pairKey}:${inverseType}` : "";

    if (processedPairs.has(typeKey)) continue;
    processedPairs.add(typeKey);
    if (inverseType) processedPairs.add(inverseTypeKey);

    // Skip disconnected nodes
    const level1 = levels.get(rel.person_id);
    const level2 = levels.get(rel.related_person_id);
    if (
      level1 === undefined ||
      level2 === undefined ||
      level1 === 999 ||
      level2 === 999
    )
      continue;

    // Get positions
    const pos1 = positionMap.get(rel.person_id);
    const pos2 = positionMap.get(rel.related_person_id);
    if (!pos1 || !pos2) continue;

    // Determine source/target and handles based on relative position
    let source: string;
    let target: string;
    let sourceHandle: string;
    let targetHandle: string;
    const isHorizontal = Math.abs(pos1.y - pos2.y) < 10;

    if (isHorizontal) {
      // Same level — horizontal connection (spouse, sibling)
      if (pos1.x <= pos2.x) {
        source = rel.person_id;
        target = rel.related_person_id;
      } else {
        source = rel.related_person_id;
        target = rel.person_id;
      }
      sourceHandle = "right";
      targetHandle = "left";
    } else {
      // Different levels — vertical (parent above, child below)
      if (pos1.y < pos2.y) {
        source = rel.person_id;
        target = rel.related_person_id;
      } else {
        source = rel.related_person_id;
        target = rel.person_id;
      }
      sourceHandle = "bottom";
      targetHandle = "top";
    }

    const label = EDGE_LABELS[relType] || relType.replace(/_/g, " ");
    const color =
      EDGE_COLORS[relType as RelationshipType] || "#A47551";
    const isPrimary = rel.is_primary !== false;

    edges.push({
      id: `${pairKey}-${relType}`,
      source,
      target,
      label,
      type: "smoothstep",
      sourceHandle,
      targetHandle,
      style: {
        stroke: color,
        strokeWidth: isPrimary ? 2 : 1.5,
        ...(isPrimary
          ? {}
          : { strokeDasharray: "6 4", opacity: 0.7 }),
      },
      labelStyle: {
        fontSize: 11,
        fill: isPrimary ? "#6B5B5D" : "#9B8B8E",
        fontWeight: isPrimary ? 600 : 400,
        ...(isPrimary ? {} : { fontStyle: "italic" }),
      },
      animated: !rel.is_confirmed,
      // Arrow marker for vertical edges (parent → child direction)
      ...(!isHorizontal
        ? {
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color,
              width: 12,
              height: 12,
            },
          }
        : {}),
    });
  }

  return { nodes, edges };
}

function FamilyTreeViewInner({
  currentUser,
  members,
  relationships,
}: FamilyTreeViewProps) {
  const t = useTranslations("tree");
  const { fitView, setCenter } = useReactFlow();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPathFinder, setShowPathFinder] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Search members by name, email, or phone
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
    );
  }, [searchQuery, members]);

  const focusMember = useCallback(
    (memberId: string) => {
      const node = nodes.find((n) => n.id === memberId);
      if (node) {
        setCenter(node.position.x + 90, node.position.y + 40, { zoom: 1.5, duration: 500 });
        setSelectedMemberId(memberId);
        setShowSearch(false);
        setSearchQuery("");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCenter]
  );

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  // Determine variant from current user's profile setting
  const variant: FamilyVariant =
    (currentUser.family_variant as FamilyVariant) || "global";
  const variantConfig = getVariantConfig(variant);

  // Compute relationship labels for all members
  const relations = useMemo(
    () => computeAllRelations(currentUser.id, members, relationships, variant),
    [currentUser.id, members, relationships, variant]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      buildGraph(
        members,
        relationships,
        currentUser.id,
        relations,
        variantConfig.myPrefix
      ),
    [members, relationships, currentUser.id, relations, variantConfig.myPrefix]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Cache tree data for offline access whenever it updates
  useEffect(() => {
    if (members.length > 0) {
      cacheTreeData(members, relationships);
    }
  }, [members, relationships]);

  // Sync nodes/edges when data changes (after router.refresh or new member added)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-[calc(100dvh-8rem)] relative">
      {/* Toolbar */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-auto z-10 flex flex-wrap gap-2 items-start">
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("addMember")}</span>
          <span className="sm:hidden">Add</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPathFinder(true)}
        >
          <Route className="h-4 w-4" />
          <span className="hidden sm:inline">Discover Path</span>
          <span className="sm:hidden">Path</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
        </Button>
        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-border text-sm text-secondary ml-auto sm:ml-0">
          {members.length} {members.length === 1 ? "member" : "members"}
        </div>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="absolute top-14 sm:top-16 left-2 sm:left-4 z-10 bg-surface border border-border rounded-xl shadow-lg p-3 w-72">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-text-light shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="flex-1 text-sm bg-transparent outline-none text-text placeholder:text-text-light/50"
              autoFocus
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-text-light hover:text-text cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => focusMember(m.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-background text-sm cursor-pointer transition-colors"
                >
                  <p className="font-medium text-text truncate">{m.full_name}</p>
                  {m.email && <p className="text-xs text-text-light truncate">{m.email}</p>}
                  {m.phone && <p className="text-xs text-text-light">{m.phone}</p>}
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-xs text-text-light text-center py-2">No members found</p>
          )}
        </div>
      )}

      {/* Legend — hidden on mobile to avoid overlap */}
      <div className="absolute bottom-20 left-4 z-10 bg-white/90 backdrop-blur rounded-xl border border-border p-3 text-xs space-y-1.5 hidden sm:block">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#2A9D8F]" />
          <span className="text-text-light">Parent / Child</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#E76F51]" />
          <span className="text-text-light">Spouse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#F4A261]" />
          <span className="text-text-light">Sibling</span>
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
        minZoom={0.1}
        maxZoom={2.5}
        panOnScroll={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
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
          familyVariant={variant}
          onClose={() => setShowPathFinder(false)}
        />
      )}

      {selectedMemberId && memberMap.get(selectedMemberId) && (
        <MemberProfileModal
          profile={memberMap.get(selectedMemberId)!}
          relationships={relationships}
          members={members}
          currentUserId={currentUser.id}
          isCurrentUser={selectedMemberId === currentUser.id}
          familyVariant={variant}
          onClose={() => setSelectedMemberId(null)}
          onEdit={(member) => {
            setSelectedMemberId(null);
            setEditingMember(member);
          }}
        />
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  );
}

export default function FamilyTreeView(props: FamilyTreeViewProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeViewInner {...props} />
    </ReactFlowProvider>
  );
}
