import React from "react";

export function Popover({ open, onOpenChange, children }) {
  return <div>{children}</div>;
}

export function PopoverTrigger({ children }) {
  return <div>{children}</div>;
}

export function PopoverContent({ children }) {
  return (
    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg p-2">
      {children}
    </div>
  );
}