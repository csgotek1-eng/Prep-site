import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it } from "node:test";

import { TRANSLATE_GUARD_SCRIPT } from "../src/lib/translate-guard.ts";

/**
 * The browser-translation guard (owner, 2026-11-10): Chrome's translation
 * moves text nodes React still holds, and React's next removeChild or
 * insertBefore threw, which took the calculator down. The guard is run here
 * against a minimal Node that throws exactly like the DOM does.
 * tests/browser/translated-page.mjs covers the real browser.
 */

class FakeNode {
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  appendChild(child: FakeNode) {
    return this.insertBefore(child, null);
  }
  insertBefore(child: FakeNode, ref: FakeNode | null) {
    if (ref && ref.parentNode !== this) throw new Error("NotFoundError: insertBefore");
    child.parentNode?.removeChild(child);
    const at = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
    this.childNodes.splice(at, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild(child: FakeNode) {
    if (child.parentNode !== this) throw new Error("NotFoundError: removeChild");
    this.childNodes.splice(this.childNodes.indexOf(child), 1);
    child.parentNode = null;
    return child;
  }
}

/** A FakeNode class with the guard installed on its prototype. */
function guarded() {
  const Node = class extends FakeNode {};
  // Own copies, so the guard wraps these and not FakeNode's.
  Node.prototype.insertBefore = FakeNode.prototype.insertBefore;
  Node.prototype.removeChild = FakeNode.prototype.removeChild;
  runInNewContext(TRANSLATE_GUARD_SCRIPT, { Node });
  return Node;
}

/** <p>text</p> after translation: <p><font>translated</font></p>, text detached. */
function translatedParagraph(Node: typeof FakeNode) {
  const p = new Node("p");
  const text = new Node("#text");
  p.appendChild(text);
  const font = new Node("font");
  p.insertBefore(font, text);
  p.removeChild(text);
  return { p, text, font };
}

describe("browser translation guard", () => {
  it("the unguarded DOM throws where the calculator crashed", () => {
    const { p, text } = translatedParagraph(FakeNode);
    assert.throws(() => p.removeChild(text), /removeChild/);
    assert.throws(() => p.insertBefore(new FakeNode("span"), text), /insertBefore/);
  });

  it("removing a node the translation already detached does nothing", () => {
    const Node = guarded();
    const { p, text, font } = translatedParagraph(Node);
    assert.equal(p.removeChild(text), text);
    assert.deepEqual(p.childNodes, [font]);
  });

  it("removing a node the translation moved removes it where it is", () => {
    const Node = guarded();
    const p = new Node("p");
    const font = new Node("font");
    const text = new Node("#text");
    p.appendChild(font);
    font.appendChild(text);
    p.removeChild(text);
    assert.equal(text.parentNode, null);
    assert.deepEqual(font.childNodes, []);
  });

  it("inserting before a moved node lands before its wrapper", () => {
    const Node = guarded();
    const p = new Node("p");
    const font = new Node("font");
    const text = new Node("#text");
    p.appendChild(font);
    font.appendChild(text);
    const span = new Node("span");
    p.insertBefore(span, text);
    assert.deepEqual(p.childNodes, [span, font]);
  });

  it("inserting before a detached node appends instead of throwing", () => {
    const Node = guarded();
    const { p, text, font } = translatedParagraph(Node);
    const span = new Node("span");
    p.insertBefore(span, text);
    assert.deepEqual(p.childNodes, [font, span]);
  });

  it("an untranslated tree behaves exactly as before", () => {
    const Node = guarded();
    const p = new Node("p");
    const a = new Node("a");
    const b = new Node("b");
    p.appendChild(b);
    p.insertBefore(a, b);
    assert.deepEqual(p.childNodes, [a, b]);
    assert.equal(p.removeChild(a), a);
    assert.deepEqual(p.childNodes, [b]);
  });

  it("is installed by the root layout on every page", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    assert.match(layout, /__html: TRANSLATE_GUARD_SCRIPT/);
  });
});
