import { ReportTaskNode, ReportTaskRow } from '../types/report.types';

/**
 * Builds a hierarchical tree from a flat list of ReportTaskRow.
 */
export function buildReportTaskTree(tasks: ReportTaskRow[]): ReportTaskNode[] {
  // Sort tasks by ID hierarchical comparison (e.g., 1, 1.1, 1.2, 2, 2.1)
  const sorted = [...tasks].sort((a, b) => {
    const aParts = a.id.split('.').map((p) => parseInt(p, 10) || 0);
    const bParts = b.id.split('.').map((p) => parseInt(p, 10) || 0);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] ?? -1;
      const bVal = bParts[i] ?? -1;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  });

  const nodeMap = new Map<string, ReportTaskNode>();
  const rootNodes: ReportTaskNode[] = [];

  // 1. Initialize nodes
  sorted.forEach((task) => {
    const node: ReportTaskNode = {
      ...task,
      children: []
    };
    nodeMap.set(task.id, node);
  });

  // 2. Link children to parent
  sorted.forEach((task) => {
    const node = nodeMap.get(task.id);
    if (!node) return;

    // Detect parent by id: e.g. "1.2" -> parent is "1"; "2.1.3" -> parent is "2.1"
    const lastDotIndex = task.id.lastIndexOf('.');
    let parentNode: ReportTaskNode | undefined;
    if (lastDotIndex > 0) {
      const parentId = task.id.substring(0, lastDotIndex);
      parentNode = nodeMap.get(parentId);
    }

    if (parentNode) {
      node.parentId = parentNode.id;
      parentNode.children.push(node);
      parentNode.isLeaf = false;
    } else {
      rootNodes.push(node);
    }
  });

  // 3. Mark leaf nodes correctly
  nodeMap.forEach((node) => {
    node.isLeaf = node.children.length === 0;
  });

  return rootNodes;
}

/**
 * Recursively recalculate parent rates as the arithmetic average of their direct children.
 */
export function recalculateNodeRates(node: ReportTaskNode): void {
  if (node.isLeaf || node.children.length === 0) {
    return;
  }

  // Recurse down children first
  node.children.forEach(recalculateNodeRates);

  // Compute average of direct children with non-empty completion rates
  let sum = 0;
  let count = 0;
  node.children.forEach((c) => {
    if (typeof c.completionRate === 'number' && !isNaN(c.completionRate)) {
      sum += c.completionRate;
      count++;
    }
  });

  if (count > 0) {
    node.completionRate = Math.round((sum / node.children.length) * 10) / 10;
  } else {
    node.completionRate = undefined;
  }
}

/**
 * Recomputes all parent completion rates across the entire task tree
 * and returns updated flat task list in order.
 */
export function recalculateAllRates(tasks: ReportTaskRow[]): ReportTaskRow[] {
  const tree = buildReportTaskTree(tasks);
  tree.forEach(recalculateNodeRates);

  const flat: ReportTaskRow[] = [];
  function traverse(node: ReportTaskNode): void {
    const { children, ...row } = node;
    flat.push(row);
    children.forEach(traverse);
  }
  tree.forEach(traverse);

  return flat;
}

