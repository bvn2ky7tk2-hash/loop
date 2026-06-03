import { usersApi } from '../../../../api/users';
import { type OrgUnitTree } from '../../../../api/org-units';
import type { AppUser, UserTaskMeta } from './constants';

export const fetchUsers = (): Promise<AppUser[]> =>
  usersApi.list() as unknown as Promise<AppUser[]>;

export function parseUserTasksFromBpmn(xml: string): UserTaskMeta[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const tasks = Array.from(
      doc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'userTask'),
    );
    if (!tasks.length) {
      const fallback = Array.from(doc.querySelectorAll('userTask'));
      return fallback.map((el) => ({
        id: el.getAttribute('id') ?? '',
        name: el.getAttribute('name') ?? el.getAttribute('id') ?? 'UserTask',
      }));
    }
    return tasks.map((el) => ({
      id: el.getAttribute('id') ?? '',
      name: el.getAttribute('name') ?? el.getAttribute('id') ?? 'UserTask',
    }));
  } catch {
    return [];
  }
}

export function flattenOrgUnits(nodes: OrgUnitTree[]): OrgUnitTree[] {
  const result: OrgUnitTree[] = [];
  function walk(arr: OrgUnitTree[]) {
    for (const n of arr) {
      result.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return result;
}
