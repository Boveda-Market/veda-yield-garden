// Browser translators (Chrome/Safari "Translate page"), extensions and live visual editors
// replace or move text nodes React still owns. React then calls removeChild/insertBefore on a
// node whose parent changed and throws NotFoundError, which blanks the whole screen.
// This guard turns those mismatches into safe no-ops instead of crashes.
const FLAG = "__bovedaDomGuard";

export function installDomGuard(proto: typeof Node.prototype | undefined = typeof Node === "undefined" ? undefined : Node.prototype) {
  if (!proto || (proto as unknown as Record<string, unknown>)[FLAG]) return;
  (proto as unknown as Record<string, unknown>)[FLAG] = true;
  const removeChild = proto.removeChild;
  const insertBefore = proto.insertBefore;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // Already detached or moved elsewhere by an outside tool: remove it from where it lives now.
      if (child.parentNode) removeChild.call(child.parentNode, child);
      return child;
    }
    return removeChild.call(this, child) as T;
  };
  proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    // Reference node was moved out by an outside tool: append so the content still shows.
    if (ref && ref.parentNode !== this) return this.appendChild(node);
    return insertBefore.call(this, node, ref) as T;
  };
}
