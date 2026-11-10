/**
 * Keeps the site working while a browser translates it (owner, 2026-11-10).
 *
 * THE CRASH. Chrome's built-in translation (Google Translate) replaces each
 * text node it translates with <font> elements and leaves the original node
 * detached. React still holds the original node. The next time React removes
 * that text or inserts before it (ticking a service in the calculator does),
 * the DOM throws "Failed to execute 'removeChild' on 'Node'" or the
 * insertBefore equivalent, the render fails, and the visitor gets the
 * "This page couldn't load" screen. Reloading does not help: the translation
 * comes straight back. Reproduced on production with the calculator.
 *
 * THE GUARD. Before React loads, removeChild and insertBefore are wrapped so
 * that a node which is no longer where React left it does not throw:
 *   - removeChild of a node that moved (now inside a <font>) removes it from
 *     where it actually is; a node that is already detached is left alone;
 *   - insertBefore with a reference node that moved inserts before its
 *     wrapper; with a detached reference node, the new node is appended.
 * Every call on an untranslated page takes the original path unchanged.
 *
 * What it does not do: a text node the translation replaced is detached, so
 * later React updates to that exact text are not visible until the page is
 * reloaded. The page keeps working, and nothing in it is lost.
 *
 * Runs as an inline script before hydration, from the root layout. The CSP
 * already allows inline scripts (next.config.ts). Plain ES5 on purpose.
 */
export const TRANSLATE_GUARD_SCRIPT =
  "(function(){if(typeof Node!=='function'||!Node.prototype)return;" +
  "var P=Node.prototype,rc=P.removeChild,ib=P.insertBefore;" +
  "P.removeChild=function(c){" +
  "if(c&&c.parentNode!==this){" +
  "if(c.parentNode)return rc.call(c.parentNode,c);" +
  "return c}" +
  "return rc.apply(this,arguments)};" +
  "P.insertBefore=function(n,r){" +
  "if(r&&r.parentNode!==this){" +
  "var a=r;while(a&&a.parentNode!==this)a=a.parentNode;" +
  "return ib.call(this,n,a||null)}" +
  "return ib.apply(this,arguments)}})();";
