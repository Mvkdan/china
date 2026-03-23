import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Fix React 19 + Radix UI portal removeChild error
// This patches DOM methods to gracefully handle nodes already removed by portals
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function(child) {
  if (child.parentNode !== this) {
    return child;
  }
  return originalRemoveChild.call(this, child);
};

const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function(newNode, refNode) {
  if (refNode && refNode.parentNode !== this) {
    return newNode;
  }
  return originalInsertBefore.call(this, newNode, refNode);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
