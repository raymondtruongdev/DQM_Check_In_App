import { TaskNode, TaskRow } from '../types/progress.types';

/**
 * Determine task level from ID string (e.g. "1" -> 1, "1.1" -> 2, "1.1.2" -> 3)
 */
export function getLevelFromId(id: string): number {
  if (!id) return 1;
  const parts = String(id).trim().split('.');
  return Math.max(1, parts.length);
}

/**
 * Get parent ID from task ID string (e.g. "1.1.2" -> "1.1", "1.1" -> "1", "1" -> undefined)
 */
export function getParentIdFromId(id: string): string | undefined {
  if (!id) return undefined;
  const parts = String(id).trim().split('.');
  if (parts.length <= 1) return undefined;
  return parts.slice(0, -1).join('.');
}

/**
 * Calculate completion rate recursively:
 * - Leaf node: user-entered rate (clamped 0-100 or undefined)
 * - Parent node: simple arithmetic average of direct children (undefined child = 0)
 */
export function calculateTreeRates(nodes: TaskNode[]): TaskNode[] {
  return nodes.map((node) => {
    if (!node.children || node.children.length === 0) {
      return {
        ...node,
        isLeaf: true
      };
    }

    const calculatedChildren = calculateTreeRates(node.children);
    let sum = 0;
    calculatedChildren.forEach((child) => {
      sum += (child.completionRate !== undefined && !isNaN(child.completionRate)) ? child.completionRate : 0;
    });

    const avg = calculatedChildren.length > 0 ? Math.round((sum / calculatedChildren.length) * 10) / 10 : 0;

    return {
      ...node,
      completionRate: avg,
      isLeaf: false,
      children: calculatedChildren
    };
  });
}

/**
 * Build hierarchical TaskNode[] tree from flat TaskRow[].
 */
export function buildTaskTree(rows: TaskRow[]): TaskNode[] {
  const nodeMap = new Map<string, TaskNode>();

  // 1. Initialise all nodes
  rows.forEach((row) => {
    const level = row.level || getLevelFromId(row.id);
    const parentId = row.parentId || getParentIdFromId(row.id);
    const node: TaskNode = {
      id: String(row.id).trim(),
      taskName: row.taskName || '',
      completionRate: row.completionRate,
      quantity: row.quantity,
      unit: row.unit || '',
      parentId,
      isCustom: row.isCustom || level >= 3,
      level,
      isLeaf: true,
      isTemplateLocked: level <= 2 && !row.isCustom,
      children: []
    };
    nodeMap.set(node.id, node);
  });

  // 2. Build tree structure
  const roots: TaskNode[] = [];
  rows.forEach((row) => {
    const id = String(row.id).trim();
    const node = nodeMap.get(id);
    if (!node) return;

    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId)!;
      parentNode.children.push(node);
      parentNode.isLeaf = false;
    } else {
      roots.push(node);
    }
  });

  // 3. Compute parent rates bottom-up
  return calculateTreeRates(roots);
}

/**
 * Flatten tree back to TaskRow[] preserving display order.
 */
export function flattenTaskTree(nodes: TaskNode[]): TaskRow[] {
  const result: TaskRow[] = [];

  function traverse(list: TaskNode[]): void {
    list.forEach((node) => {
      result.push({
        id: node.id,
        taskName: node.taskName,
        completionRate: node.completionRate,
        quantity: node.quantity,
        unit: node.unit,
        parentId: node.parentId,
        isCustom: node.isCustom,
        level: node.level
      });
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  }

  traverse(nodes);
  return result;
}

/**
 * Generate next child ID for a parent task.
 * e.g. parent "1.1" with existing children "1.1.1", "1.1.2" -> returns "1.1.3"
 */
export function generateNextChildId(parentId: string, existingTasks: TaskRow[]): string {
  const cleanParent = String(parentId).trim();
  const prefix = `${cleanParent}.`;
  let maxNum = 0;

  existingTasks.forEach((t) => {
    const tid = String(t.id).trim();
    if (tid.startsWith(prefix)) {
      const suffix = tid.substring(prefix.length);
      const parts = suffix.split('.');
      if (parts.length === 1) {
        const num = parseInt(parts[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  return `${cleanParent}.${maxNum + 1}`;
}
