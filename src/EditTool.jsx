import { useState, useEffect, useRef } from "react";

export default function EditTool() {
  const [editMode, setEditMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState(null);
  const [styles, setStyles] = useState({ width: "", height: "", color: "", fontSize: "" });
  const historyRef = useRef([]);

  useEffect(() => {
    if (!editMode) return;

    function handleClick(e) {
      if (e.target.closest(".edit-tool-ui")) return;

      e.preventDefault();
      e.stopPropagation();

      if (selectedEl) selectedEl.style.outline = "";

      e.target.style.outline = "2px solid #3b82f6";
      e.target.style.position = e.target.style.position || "relative";
      setSelectedEl(e.target);

      const computed = window.getComputedStyle(e.target);
      setStyles({
        width: e.target.offsetWidth,
        height: e.target.offsetHeight,
        color: rgbToHex(computed.backgroundColor),
        fontSize: parseInt(computed.fontSize) || 16,
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [editMode, selectedEl]);

  function toggleEditMode() {
    if (editMode && selectedEl) {
      selectedEl.style.outline = "";
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

  // Naya shape/text add karna
  function addElement(type) {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.top = "200px";
    el.style.left = "200px";
    el.style.zIndex = "9998";

    if (type === "square") {
      el.style.width = "100px";
      el.style.height = "100px";
      el.style.background = "#3b82f6";
    } else if (type === "circle") {
      el.style.width = "100px";
      el.style.height = "100px";
      el.style.background = "#3b82f6";
      el.style.borderRadius = "50%";
    } else if (type === "line") {
      el.style.width = "150px";
      el.style.height = "4px";
      el.style.background = "#3b82f6";
    } else if (type === "text") {
      el.textContent = "Double-click to edit";
      el.style.fontSize = "16px";
      el.style.color = "#000";
      el.style.background = "transparent";
      el.style.padding = "4px";
      el.contentEditable = "true";
      el.addEventListener("dblclick", (e) => e.stopPropagation());
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
      position: "fixed", width: "10px", height: "10px", background: "#3b82f6",
      border: "1px solid white", borderRadius: "50%", zIndex: 10000,
    };
    if (corner === "bottom-right") return { ...base, top: rect.bottom - 5, left: rect.right - 5, cursor: "nwse-resize" };
    if (corner === "right") return { ...base, top: rect.top + rect.height / 2 - 5, left: rect.right - 5, cursor: "ew-resize" };
    if (corner === "bottom") return { ...base, top: rect.bottom - 5, left: rect.left + rect.width / 2 - 5, cursor: "ns-resize" };
    return base;
  }

  return (
    <div className="edit-tool-ui">
      <button
        onClick={toggleEditMode}
        style={{
          position: "fixed", top: "10px", right: "10px", zIndex: 9999,
          padding: "8px 16px", background: editMode ? "#ef4444" : "#3b82f6",
          color: "white", border: "none", borderRadius: "6px", cursor: "pointer",
        }}
      >
        {editMode ? "Edit Mode: ON" : "Edit Mode: OFF"}
      </button>

      {editMode && (
        <>
          <button onClick={undo} style={toolbarBtnStyle(150)}>⟲ Undo</button>
          <button onClick={() => addElement("square")} style={toolbarBtnStyle(240)}>▭ Square</button>
          <button onClick={() => addElement("circle")} style={toolbarBtnStyle(340)}>◯ Circle</button>
          <button onClick={() => addElement("line")} style={toolbarBtnStyle(430)}>─ Line</button>
          <button onClick={() => addElement("text")} style={toolbarBtnStyle(510)}>T Text</button>
        </>
      )}

      {editMode && selectedEl && (
        <>
          <div className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, "right")} style={getHandleStyle("right")} />
          <div className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, "bottom")} style={getHandleStyle("bottom")} />
          <div className="edit-tool-ui resize-handle" onMouseDown={(e) => startResize(e, "bottom-right")} style={getHandleStyle("bottom-right")} />

          <div
            className="edit-tool-ui"
            style={{
              position: "fixed", top: "60px", right: "10px", zIndex: 9999,
              background: "white", border: "1px solid #ddd", borderRadius: "8px",
              padding: "16px", width: "220px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              fontFamily: "sans-serif", fontSize: "14px",
            }}
          >
            <p style={{ margin: "0 0 10px", fontWeight: "bold" }}>Edit Element</p>

            <label style={{ display: "block", marginBottom: "4px" }}>Width: {styles.width}px</label>
            <input type="range" min="4" max="800" value={styles.width}
              onChange={(e) => updateStyle("width", e.target.value)}
              style={{ width: "100%", marginBottom: "12px" }} />

            <label style={{ display: "block", marginBottom: "4px" }}>Height: {styles.height}px</label>
            <input type="range" min="4" max="800" value={styles.height}
              onChange={(e) => updateStyle("height", e.target.value)}
              style={{ width: "100%", marginBottom: "12px" }} />

            <label style={{ display: "block", marginBottom: "4px" }}>Text Size: {styles.fontSize}px</label>
            <input type="range" min="8" max="120" value={styles.fontSize}
              onChange={(e) => updateStyle("fontSize", e.target.value)}
              style={{ width: "100%", marginBottom: "12px" }} />

            <label style={{ display: "block", marginBottom: "4px" }}>Color:</label>
            <input type="color" value={styles.color}
              onChange={(e) => updateStyle("color", e.target.value)}
              style={{ width: "100%", height: "30px", marginBottom: "12px" }} />

            <button onClick={deleteElement} style={{
              width: "100%", padding: "8px", background: "#ef4444",
              color: "white", border: "none", borderRadius: "6px", cursor: "pointer",
            }}>
              🗑 Delete Element
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function toolbarBtnStyle(rightPos) {
  return {
    position: "fixed", top: "10px", right: `${rightPos}px`, zIndex: 9999,
    padding: "8px 14px", background: "#6b7280",
    color: "white", border: "none", borderRadius: "6px", cursor: "pointer",
  };
}

function rgbToHex(rgb) {
  const match = rgb.match(/\d+/g);
  if (!match) return "#ffffff";
  return "#" + match.slice(0, 3).map((x) => parseInt(x).toString(16).padStart(2, "0")).join("");
}