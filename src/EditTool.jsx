import { useState, useEffect, useRef } from "react";

export default function EditTool() {
  const [editMode, setEditMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState(null);
  const [styles, setStyles] = useState({ width: "", height: "", color: "", fontSize: "" });
  const [panelPos, setPanelPos] = useState({ top: 70, right: 16 });
  const historyRef = useRef([]);
  const dragInfo = useRef(null);
  const panelDragInfo = useRef(null);

  // Push the real website down so our top bar doesn't cover it
  useEffect(() => {
    document.body.style.paddingTop = "52px";
    return () => {
      document.body.style.paddingTop = "";
    };
  }, []);

  useEffect(() => {
    if (!editMode) return;

    function handleClick(e) {
      if (e.target.closest(".edit-tool-ui")) return;
      if (e.target.isContentEditable) return;

      e.preventDefault();
      e.stopPropagation();

      if (selectedEl && selectedEl !== e.target) {
        selectedEl.style.outline = "";
        selectedEl.contentEditable = "false";
      }

      e.target.style.outline = "2px solid #6366f1";
      if (!e.target.style.position || e.target.style.position === "static") {
        e.target.style.position = "relative";
      }
      setSelectedEl(e.target);

      const computed = window.getComputedStyle(e.target);
      setStyles({
        width: e.target.offsetWidth,
        height: e.target.offsetHeight,
        color: rgbToHex(computed.backgroundColor),
        fontSize: parseInt(computed.fontSize) || 16,
      });
    }

    function handleDblClick(e) {
      if (e.target.closest(".edit-tool-ui")) return;
      e.preventDefault();
      e.stopPropagation();

      saveToHistory();
      e.target.contentEditable = "true";
      e.target.style.outline = "2px dashed #22c55e";
      e.target.focus();

      function onBlur() {
        e.target.contentEditable = "false";
        e.target.style.outline = "2px solid #6366f1";
        e.target.removeEventListener("blur", onBlur);
      }
      e.target.addEventListener("blur", onBlur);
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("dblclick", handleDblClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("dblclick", handleDblClick, true);
    };
  }, [editMode, selectedEl]);

  useEffect(() => {
    if (!editMode || !selectedEl) return;

    function onMouseDown(e) {
      if (e.target !== selectedEl) return;
      if (e.target.closest(".resize-handle")) return;
      if (selectedEl.isContentEditable) return;

      e.preventDefault();
      saveToHistory();

      dragInfo.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: parseInt(selectedEl.style.left) || 0,
        startTop: parseInt(selectedEl.style.top) || 0,
      };
      selectedEl.style.position = "relative";

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e) {
      if (!dragInfo.current) return;
      const deltaX = e.clientX - dragInfo.current.startX;
      const deltaY = e.clientY - dragInfo.current.startY;
      selectedEl.style.left = dragInfo.current.startLeft + deltaX + "px";
      selectedEl.style.top = dragInfo.current.startTop + deltaY + "px";
    }

    function onMouseUp() {
      dragInfo.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    selectedEl.style.cursor = "move";
    selectedEl.addEventListener("mousedown", onMouseDown);

    return () => {
      selectedEl.removeEventListener("mousedown", onMouseDown);
      selectedEl.style.cursor = "";
    };
  }, [editMode, selectedEl]);

  function toggleEditMode() {
    if (editMode && selectedEl) {
      selectedEl.style.outline = "";
      selectedEl.contentEditable = "false";
      setSelectedEl(null);
    }
    setEditMode(!editMode);
  }

  function saveToHistory() {
    if (!selectedEl) return;
    historyRef.current.push({
      el: selectedEl,
      width: selectedEl.style.width,
      height: selectedEl.style.height,
      backgroundColor: selectedEl.style.backgroundColor,
      fontSize: selectedEl.style.fontSize,
      left: selectedEl.style.left,
      top: selectedEl.style.top,
      text: selectedEl.textContent,
    });
    if (historyRef.current.length > 20) historyRef.current.shift();
  }

  function undo() {
    const last = historyRef.current.pop();
    if (!last) return;
    last.el.style.width = last.width;
    last.el.style.height = last.height;
    last.el.style.backgroundColor = last.backgroundColor;
    last.el.style.fontSize = last.fontSize;
    last.el.style.left = last.left;
    last.el.style.top = last.top;
    if (last.el.children.length === 0) {
      last.el.textContent = last.text;
    }

    if (last.el === selectedEl) {
      const computed = window.getComputedStyle(last.el);
      setStyles({
        width: last.el.offsetWidth,
        height: last.el.offsetHeight,
        color: rgbToHex(computed.backgroundColor),
        fontSize: parseInt(computed.fontSize) || 16,
      });
    }
  }

  function updateStyle(property, value) {
    if (!selectedEl) return;
    saveToHistory();
    const unit = property === "width" || property === "height" || property === "fontSize" ? "px" : "";
    if (property === "color") {
      selectedEl.style.backgroundColor = value;
    } else {
      selectedEl.style[property] = value + unit;
    }
    setStyles((prev) => ({ ...prev, [property]: value }));
  }

  function deleteElement() {
    if (!selectedEl) return;
    selectedEl.remove();
    setSelectedEl(null);
  }

  function addElement(type) {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.top = "200px";
    el.style.left = "200px";
    el.style.zIndex = "9998";

    if (type === "square") {
      el.style.width = "100px";
      el.style.height = "100px";
      el.style.background = "#6366f1";
    } else if (type === "circle") {
      el.style.width = "100px";
      el.style.height = "100px";
      el.style.background = "#6366f1";
      el.style.borderRadius = "50%";
    } else if (type === "line") {
      el.style.width = "150px";
      el.style.height = "4px";
      el.style.background = "#6366f1";
    } else if (type === "text") {
      el.textContent = "Double-click to edit";
      el.style.fontSize = "16px";
      el.style.color = "#000";
      el.style.background = "transparent";
      el.style.padding = "4px";
    }

    document.body.appendChild(el);
  }

  function startResize(e, corner) {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedEl) return;
    saveToHistory();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = selectedEl.offsetWidth;
    const startHeight = selectedEl.offsetHeight;

    function onMouseMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let newWidth = startWidth;
      let newHeight = startHeight;
      if (corner.includes("right")) newWidth = Math.max(10, startWidth + deltaX);
      if (corner.includes("bottom")) newHeight = Math.max(10, startHeight + deltaY);
      selectedEl.style.width = newWidth + "px";
      selectedEl.style.height = newHeight + "px";
      setStyles((prev) => ({ ...prev, width: newWidth, height: newHeight }));
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function getHandleStyle(corner) {
    if (!selectedEl) return {};
    const rect = selectedEl.getBoundingClientRect();
    const base = {
      position: "fixed", width: "10px", height: "10px", background: "#6366f1",
      border: "2px solid white", borderRadius: "50%", zIndex: 10000,
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    };
    if (corner === "bottom-right") return { ...base, top: rect.bottom - 5, left: rect.right - 5, cursor: "nwse-resize" };
    if (corner === "right") return { ...base, top: rect.top + rect.height / 2 - 5, left: rect.right - 5, cursor: "ew-resize" };
    if (corner === "bottom") return { ...base, top: rect.bottom - 5, left: rect.left + rect.width / 2 - 5, cursor: "ns-resize" };
    return base;
  }

  function onPanelDragStart(e) {
    e.preventDefault();
    panelDragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: panelPos.top,
      startRight: panelPos.right,
    };
    document.addEventListener("mousemove", onPanelDragMove);
    document.addEventListener("mouseup", onPanelDragEnd);
  }

  function onPanelDragMove(e) {
    if (!panelDragInfo.current) return;
    const deltaX = e.clientX - panelDragInfo.current.startX;
    const deltaY = e.clientY - panelDragInfo.current.startY;
    setPanelPos({
      top: Math.max(8, panelDragInfo.current.startTop + deltaY),
      right: Math.max(8, panelDragInfo.current.startRight - deltaX),
    });
  }

  function onPanelDragEnd() {
    panelDragInfo.current = null;
    document.removeEventListener("mousemove", onPanelDragMove);
    document.removeEventListener("mouseup", onPanelDragEnd);
  }

  function startTextEdit() {
    if (!selectedEl) return;
    saveToHistory();
    selectedEl.contentEditable = "true";
    selectedEl.style.outline = "2px dashed #22c55e";
    selectedEl.focus();

    function onBlur() {
      selectedEl.contentEditable = "false";
      selectedEl.style.outline = "2px solid #6366f1";
      selectedEl.removeEventListener("blur", onBlur);
    }
    selectedEl.addEventListener("blur", onBlur);
  }

  return (
    <div className="edit-tool-ui">
      <div
        className="edit-tool-ui"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "52px", zIndex: 9999,
          background: "#18181b", borderBottom: "1px solid #27272a",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", fontFamily: "'Segoe UI', system-ui, sans-serif",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px", letterSpacing: "0.3px" }}>
            Web Craft
          </span>
          <span style={{
            fontSize: "11px", padding: "2px 8px", borderRadius: "10px",
            background: editMode ? "#22c55e22" : "#52525b22",
            color: editMode ? "#4ade80" : "#a1a1aa", fontWeight: 500,
          }}>
            {editMode ? "Editing" : "Idle"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {editMode && (
            <>
              <HeaderBtn onClick={undo} label="Undo" icon="⟲" />
              <Divider />
              <HeaderBtn onClick={() => addElement("square")} label="Square" icon="▭" />
              <HeaderBtn onClick={() => addElement("circle")} label="Circle" icon="◯" />
              <HeaderBtn onClick={() => addElement("line")} label="Line" icon="─" />
              <HeaderBtn onClick={() => addElement("text")} label="Text" icon="T" />
              <Divider />
            </>
          )}
          <button
            onClick={toggleEditMode}
            style={{
              padding: "7px 16px", background: editMode ? "#ef4444" : "#6366f1",
              color: "white", border: "none", borderRadius: "6px", cursor: "pointer",
              fontSize: "13px", fontWeight: 500,
            }}
          >
            {editMode ? "Exit Edit Mode" : "Edit Mode"}
          </button>
        </div>
      </div>

      {editMode && selectedEl && (
        <>
          <div className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, "right")} style={getHandleStyle("right")} />
          <div className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, "bottom")} style={getHandleStyle("bottom")} />
          <div className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, "bottom-right")} style={getHandleStyle("bottom-right")} />

          <div
            className="edit-tool-ui"
            style={{
              position: "fixed", top: panelPos.top, right: panelPos.right, zIndex: 9999,
              background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "10px",
              width: "240px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden",
            }}
          >
            <div
              onMouseDown={onPanelDragStart}
              style={{
                padding: "10px 14px", background: "#fafafa", borderBottom: "1px solid #eee",
                cursor: "grab", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#18181b" }}>Properties</span>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>⠿ drag</span>
            </div>

            <div style={{ padding: "14px" }}>
              <button onClick={startTextEdit} style={{
                width: "100%", padding: "9px", background: "#eef2ff", color: "#6366f1",
                border: "1px solid #c7d2fe", borderRadius: "6px", cursor: "pointer",
                fontSize: "13px", fontWeight: 500, marginBottom: "14px",
              }}>
                ✎ Edit Text (or double-click element)
              </button>

              <Field label={`Width — ${styles.width}px`}>
                <input type="range" min="4" max="800" value={styles.width}
                  onChange={(e) => updateStyle("width", e.target.value)} style={sliderStyle} />
              </Field>

              <Field label={`Height — ${styles.height}px`}>
                <input type="range" min="4" max="800" value={styles.height}
                  onChange={(e) => updateStyle("height", e.target.value)} style={sliderStyle} />
              </Field>

              <Field label={`Text Size — ${styles.fontSize}px`}>
                <input type="range" min="8" max="120" value={styles.fontSize}
                  onChange={(e) => updateStyle("fontSize", e.target.value)} style={sliderStyle} />
              </Field>

              <Field label="Color">
                <input type="color" value={styles.color}
                  onChange={(e) => updateStyle("color", e.target.value)}
                  style={{ width: "100%", height: "32px", border: "1px solid #e4e4e7", borderRadius: "6px", cursor: "pointer" }} />
              </Field>

              <button onClick={deleteElement} style={{
                width: "100%", padding: "9px", background: "#fef2f2", color: "#ef4444",
                border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer",
                fontSize: "13px", fontWeight: 500, marginTop: "4px",
              }}>
                Delete Element
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HeaderBtn({ onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: "6px 10px", background: "transparent", color: "#d4d4d8",
        border: "1px solid #3f3f46", borderRadius: "6px", cursor: "pointer",
        fontSize: "13px", display: "flex", alignItems: "center", gap: "6px",
      }}
    >
      <span>{icon}</span>
    </button>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "22px", background: "#3f3f46" }} />;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "#52525b", fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const sliderStyle = { width: "100%", accentColor: "#6366f1" };

function rgbToHex(rgb) {
  const match = rgb.match(/\d+/g);
  if (!match) return "#ffffff";
  return "#" + match.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, "0")).join("");
}
