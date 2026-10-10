import { useState, useEffect, useRef } from "react";
import { tileCategories, extractContent } from "./tileTemplates";
import { getVariantsFor, applyVariant } from "./styleSuggestions";

const FONTS = ["Segoe UI", "Arial", "Georgia", "'Times New Roman'", "'Courier New'", "Verdana", "'Trebuchet MS'", "Tahoma"];
const WEIGHTS = [
  { label: "Regular", value: "400" }, { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" }, { label: "Bold", value: "700" }, { label: "Black", value: "900" },
];
const SHADOWS = { none: "none", soft: "0 2px 8px rgba(0,0,0,0.12)", strong: "0 8px 24px rgba(0,0,0,0.25)" };
const COLOR_PRESETS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899", "#18181b", "#ffffff"];
const CUSTOM_TILES_KEY = "webcraft_custom_tiles";

function loadCustomTiles() {
  try {
    const raw = localStorage.getItem(CUSTOM_TILES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return arr.map((t) => ({ ...t, render: () => t.html }));
  } catch {
    return [];
  }
}
function persistCustomTiles(tiles) {
  try {
    const raw = tiles.map((t) => ({ id: t.id, name: t.name, preview: t.preview, html: t.html }));
    localStorage.setItem(CUSTOM_TILES_KEY, JSON.stringify(raw));
  } catch {}
}

export default function EditTool() {
  const [editMode, setEditMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState(null);
  const [styles, setStyles] = useState({
    width: 0, height: 0, color: "#ffffff", fontSize: 16, padding: 0, margin: 0,
    fontFamily: "Segoe UI", fontWeight: "400", textAlign: "left",
    borderRadius: 0, opacity: 1, shadow: "none",
    rotation: 0, borderWidth: 0, borderColor: "#6366f1", blur: 0,
  });
  const [panelPos, setPanelPos] = useState({ top: 64, right: 16 });
  const [showTilesModal, setShowTilesModal] = useState(false);
  const [customTiles, setCustomTiles] = useState([]);
  const [activeTile, setActiveTile] = useState(null);
  const [showReplaceIt, setShowReplaceIt] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [, bump] = useState(0);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const dragInfo = useRef(null);
  const panelDragInfo = useRef(null);
  const zCounter = useRef(9000);

  useEffect(() => {
    document.body.style.paddingTop = "52px";
    setCustomTiles(loadCustomTiles());
    return () => { document.body.style.paddingTop = ""; };
  }, []);

  function readStylesFrom(el) {
    const c = window.getComputedStyle(el);
    const rotMatch = (el.style.transform || "").match(/rotate\(([-\d.]+)deg\)/);
    return {
      width: el.offsetWidth, height: el.offsetHeight,
      color: rgbToHex(c.backgroundColor),
      fontSize: parseInt(c.fontSize) || 16,
      padding: parseInt(c.paddingTop) || 0,
      margin: parseInt(c.marginTop) || 0,
      fontFamily: (el.style.fontFamily || "Segoe UI").replace(/'/g, ""),
      fontWeight: el.style.fontWeight || c.fontWeight || "400",
      textAlign: el.style.textAlign || c.textAlign || "left",
      borderRadius: parseInt(c.borderRadius) || 0,
      opacity: c.opacity ? parseFloat(c.opacity) : 1,
      shadow: el.dataset.wcShadow || "none",
      rotation: rotMatch ? parseFloat(rotMatch[1]) : 0,
      borderWidth: parseInt(c.borderTopWidth) || 0,
      borderColor: rgbToHex(c.borderTopColor) || "#6366f1",
      blur: parseFloat((c.filter.match(/blur\(([\d.]+)px\)/) || [])[1]) || 0,
    };
  }

  function clearSelection() {
    if (selectedEl) { selectedEl.style.outline = ""; selectedEl.contentEditable = "false"; }
    setSelectedEl(null);
  }

  function selectElement(el) {
    if (selectedEl && selectedEl !== el) { selectedEl.style.outline = ""; selectedEl.contentEditable = "false"; }
    el.style.outline = "2px solid #6366f1";
    el.style.outlineOffset = "1px";
    if (!el.style.position || el.style.position === "static") el.style.position = "relative";
    setSelectedEl(el);
    setStyles(readStylesFrom(el));
  }

  useEffect(() => {
    if (!editMode) return;
    function handleClick(e) {
      if (e.target.closest(".edit-tool-ui")) return;
      if (e.target.isContentEditable) return;
      e.preventDefault(); e.stopPropagation();
      if (activeTile) { setReplaceTarget(e.target); return; }
      const targetEl = e.altKey && e.target.parentElement ? e.target.parentElement : e.target;
      selectElement(targetEl);
    }
    function handleDblClick(e) {
      if (e.target.closest(".edit-tool-ui")) return;
      e.preventDefault(); e.stopPropagation();
      enterTextEdit(e.target);
    }
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dblclick", handleDblClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("dblclick", handleDblClick, true);
    };
  }, [editMode, selectedEl, activeTile]);

  useEffect(() => {
    if (!editMode) return;
    function onKeyDown(e) {
      if (document.activeElement?.isContentEditable) return;
      if (e.key === "Escape") { clearSelection(); setActiveTile(null); setReplaceTarget(null); setShowTilesModal(false); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEl) { e.preventDefault(); deleteElement(); }
      if (e.ctrlKey && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key.toLowerCase() === "d" && selectedEl) { e.preventDefault(); duplicateElement(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode, selectedEl]);

  useEffect(() => {
    if (!editMode || !selectedEl) return;
    function onMouseDown(e) {
      if (e.target !== selectedEl) return;
      if (e.target.closest(".resize-handle")) return;
      if (selectedEl.isContentEditable) return;
      e.preventDefault();
      saveToHistory();
      dragInfo.current = { startX: e.clientX, startY: e.clientY, startLeft: parseInt(selectedEl.style.left) || 0, startTop: parseInt(selectedEl.style.top) || 0 };
      selectedEl.style.position = "relative";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
    function onMouseMove(e) {
      if (!dragInfo.current) return;
      const dX = e.clientX - dragInfo.current.startX, dY = e.clientY - dragInfo.current.startY;
      let newLeft = dragInfo.current.startLeft + dX, newTop = dragInfo.current.startTop + dY;
      const rect = selectedEl.getBoundingClientRect();
      const vCenterX = window.innerWidth / 2, vCenterY = window.innerHeight / 2;
      const curCenterX = rect.left + rect.width / 2, curCenterY = rect.top + rect.height / 2;
      const T = 8;
      const nearV = Math.abs(curCenterX - vCenterX) < T, nearH = Math.abs(curCenterY - vCenterY) < T;
      setGuides({ v: nearV, h: nearH });
      if (nearV) newLeft += vCenterX - curCenterX;
      if (nearH) newTop += vCenterY - curCenterY;
      selectedEl.style.left = newLeft + "px";
      selectedEl.style.top = newTop + "px";
    }
    function onMouseUp() {
      dragInfo.current = null;
      setGuides({ v: false, h: false });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    selectedEl.style.cursor = "grab";
    selectedEl.addEventListener("mousedown", onMouseDown);
    return () => { selectedEl.removeEventListener("mousedown", onMouseDown); selectedEl.style.cursor = ""; };
  }, [editMode, selectedEl]);

  function toggleEditMode() {
    if (editMode) clearSelection();
    setActiveTile(null);
    setEditMode(!editMode);
  }

  function saveToHistory() { if (selectedEl) saveToHistoryFor(selectedEl); }
  function saveToHistoryFor(el) {
    undoStack.current.push({ el, cssText: el.style.cssText, text: el.textContent, html: el.innerHTML });
    redoStack.current = [];
    if (undoStack.current.length > 30) undoStack.current.shift();
  }

  function undo() {
    const last = undoStack.current.pop();
    if (!last) return;
    redoStack.current.push({ el: last.el, cssText: last.el.style.cssText, text: last.el.textContent, html: last.el.innerHTML });
    last.el.style.cssText = last.cssText;
    if (last.el.children.length === 0) last.el.textContent = last.text; else last.el.innerHTML = last.html;
    if (last.el === selectedEl) setStyles(readStylesFrom(last.el));
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ el: next.el, cssText: next.el.style.cssText, text: next.el.textContent, html: next.el.innerHTML });
    next.el.style.cssText = next.cssText;
    if (next.el.children.length === 0) next.el.textContent = next.text; else next.el.innerHTML = next.html;
    if (next.el === selectedEl) setStyles(readStylesFrom(next.el));
  }

  function updateStyle(property, value) {
    if (!selectedEl) return;
    saveToHistory();
    const pxProps = ["width", "height", "fontSize", "padding", "margin", "borderRadius", "borderWidth"];
    if (property === "color") selectedEl.style.backgroundColor = value;
    else if (property === "fontFamily") selectedEl.style.fontFamily = value;
    else if (property === "fontWeight") selectedEl.style.fontWeight = value;
    else if (property === "textAlign") selectedEl.style.textAlign = value;
    else if (property === "opacity") selectedEl.style.opacity = value;
    else if (property === "shadow") { selectedEl.style.boxShadow = SHADOWS[value]; selectedEl.dataset.wcShadow = value; }
    else if (property === "rotation") selectedEl.style.transform = `rotate(${value}deg)`;
    else if (property === "borderColor") selectedEl.style.borderColor = value;
    else if (property === "blur") selectedEl.style.filter = value > 0 ? `blur(${value}px)` : "";
    else if (property === "borderWidth") { selectedEl.style.borderWidth = value + "px"; selectedEl.style.borderStyle = "solid"; }
    else if (pxProps.includes(property)) selectedEl.style[property] = value + "px";
    setStyles((prev) => ({ ...prev, [property]: value }));
    bump((n) => n + 1);
  }

  function bringToFront() { if (!selectedEl) return; saveToHistory(); zCounter.current += 1; selectedEl.style.zIndex = zCounter.current; }
  function sendToBack() { if (!selectedEl) return; saveToHistory(); selectedEl.style.zIndex = "0"; }
  function deleteElement() { if (!selectedEl) return; selectedEl.remove(); setSelectedEl(null); }

  function duplicateElement() {
    if (!selectedEl) return;
    const clone = selectedEl.cloneNode(true);
    const curLeft = parseInt(selectedEl.style.left) || 0;
    const curTop = parseInt(selectedEl.style.top) || 0;
    clone.style.left = curLeft + 20 + "px";
    clone.style.top = curTop + 20 + "px";
    clone.style.outline = "";
    selectedEl.insertAdjacentElement("afterend", clone);
    selectElement(clone);
  }

  function flip(axis) {
    if (!selectedEl) return;
    saveToHistory();
    const current = selectedEl.style.transform || "";
    const flipTag = axis === "h" ? "scaleX(-1)" : "scaleY(-1)";
    const hasFlip = current.includes(flipTag);
    const rotatePart = current.match(/rotate\([^)]*\)/)?.[0] || "";
    const otherFlip = axis === "h" ? (current.includes("scaleY(-1)") ? "scaleY(-1)" : "") : (current.includes("scaleX(-1)") ? "scaleX(-1)" : "");
    selectedEl.style.transform = [rotatePart, hasFlip ? "" : flipTag, otherFlip].filter(Boolean).join(" ");
  }

  function enterTextEdit(el) {
    saveToHistoryFor(el);
    el.contentEditable = "true";
    el.style.outline = "2px dashed #22c55e";
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    function onBlur() {
      el.contentEditable = "false";
      el.style.outline = selectedEl === el ? "2px solid #6366f1" : "";
      el.removeEventListener("blur", onBlur);
    }
    el.addEventListener("blur", onBlur);
  }

  function addElement(type) {
    const el = document.createElement("div");
    el.style.position = "fixed"; el.style.top = "220px"; el.style.left = "220px"; el.style.zIndex = "9998";
    if (type === "square") { el.style.width = "100px"; el.style.height = "100px"; el.style.background = "transparent"; el.style.border = "2px solid #6366f1"; el.style.borderRadius = "4px"; }
    else if (type === "circle") { el.style.width = "100px"; el.style.height = "100px"; el.style.background = "transparent"; el.style.border = "2px solid #6366f1"; el.style.borderRadius = "50%"; }
    else if (type === "line") { el.style.width = "150px"; el.style.height = "0px"; el.style.borderTop = "2px solid #6366f1"; }
    else if (type === "text") { el.textContent = "Double-click to edit"; el.style.fontSize = "16px"; el.style.color = "#18181b"; el.style.background = "transparent"; el.style.padding = "4px"; }
    document.body.appendChild(el);
    selectElement(el);
  }

  function startResize(e, dir) {
    e.preventDefault(); e.stopPropagation();
    if (!selectedEl) return;
    saveToHistory();
    const startX = e.clientX, startY = e.clientY;
    const startWidth = selectedEl.offsetWidth, startHeight = selectedEl.offsetHeight;
    function onMove(ev) {
      const dX = ev.clientX - startX, dY = ev.clientY - startY;
      let w = startWidth, h = startHeight;
      if (dir.includes("e")) w = Math.max(8, startWidth + dX);
      if (dir.includes("w")) w = Math.max(8, startWidth - dX);
      if (dir.includes("s")) h = Math.max(8, startHeight + dY);
      if (dir.includes("n")) h = Math.max(8, startHeight - dY);
      selectedEl.style.width = w + "px"; selectedEl.style.height = h + "px";
      bump((n) => n + 1);
      setStyles((p) => ({ ...p, width: w, height: h }));
    }
    function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const HANDLE_DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  function handleStyleFor(dir) {
    if (!selectedEl) return {};
    const r = selectedEl.getBoundingClientRect();
    const size = 9;
    const cursorMap = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
    const pos = { top: r.top, left: r.left, right: r.right, bottom: r.bottom, midX: r.left + r.width / 2, midY: r.top + r.height / 2 };
    const coords = {
      n: { top: pos.top, left: pos.midX }, s: { top: pos.bottom, left: pos.midX },
      e: { top: pos.midY, left: pos.right }, w: { top: pos.midY, left: pos.left },
      ne: { top: pos.top, left: pos.right }, nw: { top: pos.top, left: pos.left },
      se: { top: pos.bottom, left: pos.right }, sw: { top: pos.bottom, left: pos.left },
    };
    return { position: "fixed", width: size, height: size, background: "#fff", border: "2px solid #6366f1", borderRadius: "2px", zIndex: 10000, top: coords[dir].top - size / 2, left: coords[dir].left - size / 2, cursor: cursorMap[dir], boxShadow: "0 1px 3px rgba(0,0,0,0.25)" };
  }

  function onPanelDragStart(e) {
    e.preventDefault();
    panelDragInfo.current = { startX: e.clientX, startY: e.clientY, startTop: panelPos.top, startRight: panelPos.right };
    document.addEventListener("mousemove", onPanelDragMove);
    document.addEventListener("mouseup", onPanelDragEnd);
  }
  function onPanelDragMove(e) {
    if (!panelDragInfo.current) return;
    const dX = e.clientX - panelDragInfo.current.startX, dY = e.clientY - panelDragInfo.current.startY;
    setPanelPos({ top: Math.max(8, panelDragInfo.current.startTop + dY), right: Math.max(8, panelDragInfo.current.startRight - dX) });
  }
  function onPanelDragEnd() { panelDragInfo.current = null; document.removeEventListener("mousemove", onPanelDragMove); document.removeEventListener("mouseup", onPanelDragEnd); }

  function armTile(tile) { setShowTilesModal(false); clearSelection(); setActiveTile(tile); }
  function confirmReplace() {
    if (!replaceTarget || !activeTile) return;
    saveToHistoryFor(replaceTarget);
    const data = extractContent(replaceTarget);
    replaceTarget.outerHTML = activeTile.render(data);
    setReplaceTarget(null); setActiveTile(null);
  }

  function saveCurrentAsTile() {
    if (!selectedEl) return;
    const name = window.prompt("Name this tile:", "My Tile");
    if (!name) return;
    const newTile = { id: "custom-" + Date.now(), name, preview: "⭐", html: selectedEl.outerHTML };
    const updated = [...customTiles, newTile];
    setCustomTiles(updated);
    persistCustomTiles(updated);
  }

  function deleteCustomTile(id, e) {
    e.stopPropagation();
    const updated = customTiles.filter((t) => t.id !== id);
    setCustomTiles(updated);
    persistCustomTiles(updated);
  }

  const replaceRect = replaceTarget ? replaceTarget.getBoundingClientRect() : null;
  const selRect = selectedEl ? selectedEl.getBoundingClientRect() : null;
  const allCategories = { ...tileCategories, ...(customTiles.length ? { "My Tiles": customTiles.map((t) => ({ ...t, render: () => t.html })) } : {}) };

  return (
    <div className="edit-tool-ui">
      {guides.v && <div className="edit-tool-ui" style={guideLineStyle("v")} />}
      {guides.h && <div className="edit-tool-ui" style={guideLineStyle("h")} />}

      {editMode && selectedEl && selRect && !activeTile && (
        <div className="edit-tool-ui" style={{ position: "fixed", top: selRect.top, left: selRect.left, width: selRect.width, height: selRect.height, border: "1.5px solid #6366f1", borderRadius: "2px", pointerEvents: "none", zIndex: 9997 }} />
      )}

      <div className="edit-tool-ui" style={topBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Web Craft</span>
          <StatusPill on={editMode} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {editMode && (
            <>
              <IconBtn onClick={undo} title="Undo (Ctrl+Z)">⟲</IconBtn>
              <IconBtn onClick={redo} title="Redo (Ctrl+Y)">⟳</IconBtn>
              <Divider />
              <IconBtn onClick={() => addElement("square")} title="Add Square">▭</IconBtn>
              <IconBtn onClick={() => addElement("circle")} title="Add Circle">◯</IconBtn>
              <IconBtn onClick={() => addElement("line")} title="Add Line">─</IconBtn>
              <IconBtn onClick={() => addElement("text")} title="Add Text">T</IconBtn>
              <Divider />
              <button onClick={() => setShowTilesModal(true)} style={tilesBtnStyle(showTilesModal)}>▦ Tiles</button>
              <Divider />
            </>
          )}
          <button onClick={toggleEditMode} style={mainBtnStyle(editMode)}>{editMode ? "Exit Edit Mode" : "Edit Mode"}</button>
        </div>
      </div>

      {/* ---- FULL SCREEN TILES GALLERY ---- */}
      {showTilesModal && (
        <div className="edit-tool-ui" style={modalOverlayStyle}>
          <div style={modalHeaderStyle}>
            <span style={{ fontWeight: 700, fontSize: "18px", color: "#fff" }}>Tile Gallery</span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {selectedEl && (
                <button onClick={saveCurrentAsTile} style={saveTileBtnStyle}>
                  💾 Save Selected as Tile
                </button>
              )}
              <button onClick={() => setShowTilesModal(false)} style={modalCloseStyle}>✕ Close</button>
            </div>
          </div>

          <div style={modalBodyStyle}>
            {Object.keys(allCategories).map((cat) => (
              <div key={cat} style={{ marginBottom: "32px" }}>
                <p style={categoryLabelStyle}>{cat}</p>
                <div style={tileGridStyle}>
                  {allCategories[cat].map((tile) => (
                    <div key={tile.id} onClick={() => armTile(tile)} style={tileCardStyle}>
                      {tile.id.startsWith("custom-") && (
                        <button onClick={(e) => deleteCustomTile(tile.id, e)} style={tileDeleteBtnStyle}>✕</button>
                      )}
                      <div style={tilePreviewBoxStyle}>
                        <div style={tilePreviewInnerStyle} dangerouslySetInnerHTML={{ __html: tile.render ? tile.render({}) : tile.html }} />
                      </div>
                      <p style={tileCardLabelStyle}>{tile.preview} {tile.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!selectedEl && (
              <p style={{ color: "#71717a", fontSize: "13px", textAlign: "center", marginTop: "20px" }}>
                Tip: select an element on your page first, then come back here to save it as your own tile.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTile && (
        <div className="edit-tool-ui" style={placementBannerStyle}>
          <span>Placing "{activeTile.name}" — click an element to replace it</span>
          <button onClick={() => { setActiveTile(null); setReplaceTarget(null); }} style={cancelPillStyle}>Cancel</button>
        </div>
      )}

      {replaceTarget && replaceRect && (
        <div className="edit-tool-ui" style={{ position: "fixed", top: replaceRect.top - 44, left: replaceRect.left, zIndex: 10002, background: "#18181b", borderRadius: "8px", padding: "8px", display: "flex", gap: "6px", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
          <button onClick={confirmReplace} style={confirmBtnStyle}>Replace ✓</button>
          <button onClick={() => setReplaceTarget(null)} style={cancelBtnStyle}>Cancel</button>
        </div>
      )}

      {editMode && selectedEl && !activeTile && !showTilesModal && HANDLE_DIRS.map((dir) => (
        <div key={dir} className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, dir)} style={handleStyleFor(dir)} />
      ))}

      {editMode && selectedEl && !activeTile && !showTilesModal && (
        <div className="edit-tool-ui" style={{ ...panelStyle, top: panelPos.top, right: panelPos.right }}>
          <div onMouseDown={onPanelDragStart} style={panelHeaderStyle}>
            <span style={{ fontWeight: 600, fontSize: "13px", color: "#18181b" }}>Properties</span>
            <span style={{ fontSize: "11px", color: "#a1a1aa" }}>⠿</span>
          </div>

          <div style={{ padding: "14px" }}>
            <button onClick={() => enterTextEdit(selectedEl)} style={editTextBtnStyle}>✎ Edit Text</button>
            <button onClick={() => setShowReplaceIt(true)} style={{ ...saveAsTilePanelBtnStyle, background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>🔁 Replace It (Style Suggestions)</button>
            <button onClick={saveCurrentAsTile} style={saveAsTilePanelBtnStyle}>💾 Save as Tile</button>

            <SectionLabel>Layer & Actions</SectionLabel>
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              <SmallBtn onClick={bringToFront}>⬆ Front</SmallBtn>
              <SmallBtn onClick={sendToBack}>⬇ Back</SmallBtn>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              <SmallBtn onClick={duplicateElement}>⎘ Duplicate</SmallBtn>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
              <SmallBtn onClick={() => flip("h")}>⇋ Flip H</SmallBtn>
              <SmallBtn onClick={() => flip("v")}>⇅ Flip V</SmallBtn>
            </div>

            <SectionLabel>Typography</SectionLabel>
            <Field label="Font Family">
              <select value={styles.fontFamily} onChange={(e) => updateStyle("fontFamily", e.target.value)} style={selectStyle}>
                {FONTS.map((f) => <option key={f} value={f}>{f.replace(/'/g, "")}</option>)}
              </select>
            </Field>
            <Field label="Font Weight">
              <select value={styles.fontWeight} onChange={(e) => updateStyle("fontWeight", e.target.value)} style={selectStyle}>
                {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </Field>
            <Field label="Text Align">
              <div style={{ display: "flex", gap: "6px" }}>
                {["left", "center", "right"].map((a) => (
                  <button key={a} onClick={() => updateStyle("textAlign", a)} style={{ ...segBtnStyle, background: styles.textAlign === a ? "#6366f1" : "#f4f4f5", color: styles.textAlign === a ? "#fff" : "#3f3f46" }}>
                    {a === "left" ? "⬅" : a === "center" ? "⬌" : "➡"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={`Text Size — ${styles.fontSize}px`}>
              <input type="range" min="8" max="120" value={styles.fontSize} onChange={(e) => updateStyle("fontSize", e.target.value)} style={sliderStyle} />
            </Field>

            <SectionLabel>Transform</SectionLabel>
            <Field label={`Rotation — ${styles.rotation}°`}>
              <input type="range" min="-180" max="180" value={styles.rotation} onChange={(e) => updateStyle("rotation", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label={`Width — ${styles.width}px`}>
              <input type="range" min="4" max="900" value={styles.width} onChange={(e) => updateStyle("width", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label={`Height — ${styles.height}px`}>
              <input type="range" min="4" max="900" value={styles.height} onChange={(e) => updateStyle("height", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label={`Corner Radius — ${styles.borderRadius}px`}>
              <input type="range" min="0" max="100" value={styles.borderRadius} onChange={(e) => updateStyle("borderRadius", e.target.value)} style={sliderStyle} />
            </Field>

            <SectionLabel>Spacing</SectionLabel>
            <Field label={`Padding — ${styles.padding}px`}>
              <input type="range" min="0" max="80" value={styles.padding} onChange={(e) => updateStyle("padding", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label={`Margin — ${styles.margin}px`}>
              <input type="range" min="0" max="80" value={styles.margin} onChange={(e) => updateStyle("margin", e.target.value)} style={sliderStyle} />
            </Field>

            <SectionLabel>Border</SectionLabel>
            <Field label={`Border Width — ${styles.borderWidth}px`}>
              <input type="range" min="0" max="20" value={styles.borderWidth} onChange={(e) => updateStyle("borderWidth", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label="Border Color">
              <input type="color" value={styles.borderColor} onChange={(e) => updateStyle("borderColor", e.target.value)} style={colorInputStyle} />
            </Field>

            <SectionLabel>Appearance</SectionLabel>
            <Field label="Fill Color">
              <input type="color" value={styles.color} onChange={(e) => updateStyle("color", e.target.value)} style={colorInputStyle} />
              <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap" }}>
                {COLOR_PRESETS.map((c) => (
                  <button key={c} onClick={() => updateStyle("color", c)} title={c} style={{ width: "20px", height: "20px", borderRadius: "5px", background: c, border: "1px solid #e4e4e7", cursor: "pointer" }} />
                ))}
              </div>
            </Field>
            <Field label={`Opacity — ${Math.round(styles.opacity * 100)}%`}>
              <input type="range" min="0" max="1" step="0.05" value={styles.opacity} onChange={(e) => updateStyle("opacity", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label={`Blur — ${styles.blur}px`}>
              <input type="range" min="0" max="20" value={styles.blur} onChange={(e) => updateStyle("blur", e.target.value)} style={sliderStyle} />
            </Field>
            <Field label="Shadow">
              <div style={{ display: "flex", gap: "6px" }}>
                {Object.keys(SHADOWS).map((s) => (
                  <button key={s} onClick={() => updateStyle("shadow", s)} style={{ ...segBtnStyle, background: styles.shadow === s ? "#6366f1" : "#f4f4f5", color: styles.shadow === s ? "#fff" : "#3f3f46", textTransform: "capitalize" }}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <button onClick={deleteElement} style={deleteBtnStyle}>
              Delete Element <span style={{ opacity: 0.6, fontSize: "11px" }}>(Del)</span>
            </button>
          </div>
        </div>
      )}

      {showReplaceIt && selectedEl && (
        <div className="edit-tool-ui" style={{
          position: "fixed", top: "70px", right: "16px", zIndex: 10003,
          background: "#fff", border: "1px solid #e4e4e7", borderRadius: "10px",
          width: "280px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "14px",
          maxHeight: "80vh", overflowY: "auto",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600, fontSize: "13px" }}>Replace It</span>
            <button onClick={() => setShowReplaceIt(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#a1a1aa" }}>✕</button>
          </div>
          <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 12px" }}>
            Choose a new look — the name/text stays the same.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {getVariantsFor(selectedEl).map((variant) => (
              <div key={variant.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#52525b", fontWeight: 500 }}>{variant.label}</span>
                <button
                  onClick={() => {
                    saveToHistory();
                    applyVariant(selectedEl, variant);
                    setStyles(readStylesFrom(selectedEl));
                    setShowReplaceIt(false);
                  }}
                  style={{ ...variant.style, cursor: "pointer", fontFamily: "'Segoe UI', system-ui, sans-serif", textAlign: "center" }}
                >
                  {selectedEl.textContent || "Preview"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, title, children }) { return <button onClick={onClick} title={title} style={iconBtnStyle}>{children}</button>; }
function SmallBtn({ onClick, children }) { return <button onClick={onClick} style={smallBtnStyle}>{children}</button>; }
function Divider() { return <div style={{ width: "1px", height: "22px", background: "#3f3f46" }} />; }
function StatusPill({ on }) { return <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: on ? "#22c55e22" : "#52525b22", color: on ? "#4ade80" : "#a1a1aa", fontWeight: 500 }}>{on ? "Editing" : "Idle"}</span>; }
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", marginBottom: "5px", fontSize: "11.5px", color: "#52525b", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}
function SectionLabel({ children }) { return <p style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.4px", color: "#a1a1aa", textTransform: "uppercase", margin: "14px 0 8px" }}>{children}</p>; }

const topBarStyle = { position: "fixed", top: 0, left: 0, right: 0, height: "52px", zIndex: 9999, background: "#18181b", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontFamily: "'Segoe UI', system-ui, sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" };
const iconBtnStyle = { padding: "6px 10px", background: "transparent", color: "#d4d4d8", border: "1px solid #3f3f46", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const smallBtnStyle = { flex: 1, padding: "7px", background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "6px", cursor: "pointer", fontSize: "11.5px", fontWeight: 500, color: "#3f3f46" };
const mainBtnStyle = (on) => ({ padding: "7px 16px", background: on ? "#ef4444" : "#6366f1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 });
const tilesBtnStyle = (open) => ({ padding: "6px 14px", background: open ? "#27272a" : "transparent", color: "#d4d4d8", border: "1px solid #3f3f46", borderRadius: "6px", cursor: "pointer", fontSize: "13px" });

const modalOverlayStyle = { position: "fixed", inset: 0, background: "#09090bf2", zIndex: 10500, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif" };
const modalHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #27272a" };
const modalCloseStyle = { padding: "8px 16px", background: "#27272a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const saveTileBtnStyle = { padding: "8px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 };
const modalBodyStyle = { flex: 1, overflowY: "auto", padding: "24px 28px" };
const categoryLabelStyle = { fontSize: "13px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px" };
const tileGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px" };
const tileCardStyle = { position: "relative", background: "#18181b", border: "1px solid #27272a", borderRadius: "10px", padding: "12px", cursor: "pointer", transition: "border-color 0.15s, transform 0.1s" };
const tilePreviewBoxStyle = { height: "120px", background: "#fafafa", borderRadius: "6px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" };
const tilePreviewInnerStyle = { transform: "scale(0.5)", transformOrigin: "center", pointerEvents: "none" };
const tileCardLabelStyle = { color: "#e4e4e7", fontSize: "12.5px", margin: 0, textAlign: "center" };
const tileDeleteBtnStyle = { position: "absolute", top: "6px", right: "6px", width: "22px", height: "22px", borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "11px", zIndex: 2 };

const placementBannerStyle = { position: "fixed", top: "60px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#18181b", color: "#fff", padding: "8px 16px", borderRadius: "20px", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px", fontFamily: "'Segoe UI', system-ui, sans-serif", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" };
const cancelPillStyle = { background: "#ef4444", border: "none", color: "#fff", borderRadius: "10px", padding: "2px 10px", cursor: "pointer", fontSize: "11px" };
const confirmBtnStyle = { background: "#22c55e", color: "#fff", border: "none", borderRadius: "5px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" };
const cancelBtnStyle = { background: "#3f3f46", color: "#fff", border: "none", borderRadius: "5px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" };
const panelStyle = { position: "fixed", zIndex: 9999, background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "10px", width: "255px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden", maxHeight: "85vh", overflowY: "auto" };
const panelHeaderStyle = { padding: "10px 14px", background: "#fafafa", borderBottom: "1px solid #eee", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0 };
const editTextBtnStyle = { width: "100%", padding: "9px", background: "#eef2ff", color: "#6366f1", border: "1px solid #c7d2fe", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500, marginBottom: "6px" };
const saveAsTilePanelBtnStyle = { width: "100%", padding: "9px", background: "#f0fdf4", color: "#22c55e", border: "1px solid #bbf7d0", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500, marginBottom: "4px" };
const sliderStyle = { width: "100%", accentColor: "#6366f1" };
const colorInputStyle = { width: "100%", height: "32px", border: "1px solid #e4e4e7", borderRadius: "6px", cursor: "pointer", padding: "2px" };
const selectStyle = { width: "100%", padding: "7px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "12.5px", color: "#18181b", background: "#fff" };
const segBtnStyle = { flex: 1, padding: "7px", border: "1px solid #e4e4e7", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500 };
const deleteBtnStyle = { width: "100%", padding: "9px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500, marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" };

function guideLineStyle(axis) {
  return axis === "v"
    ? { position: "fixed", top: 0, bottom: 0, left: "50%", width: "1px", background: "#ec4899", zIndex: 10001, pointerEvents: "none" }
    : { position: "fixed", left: 0, right: 0, top: "50%", height: "1px", background: "#ec4899", zIndex: 10001, pointerEvents: "none" };
}
function rgbToHex(rgb) {
  const match = rgb.match(/\d+/g);
  if (!match) return "#ffffff";
  return "#" + match.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, "0")).join("");
}
