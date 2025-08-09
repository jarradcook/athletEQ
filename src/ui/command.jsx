import React from "react";

export function Command({ children }) {
  return <div className="p-2">{children}</div>;
}

export function CommandInput(props) {
  return (
    <input
      {...props}
      className="w-full px-2 py-1 border-b border-gray-300 focus:outline-none"
    />
  );
}

export function CommandItem({ children, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
    >
      {children}
    </div>
  );
}

export function CommandList({ children }) {
  return <div>{children}</div>;
}

export function CommandGroup({ children }) {
  return <div className="mt-2">{children}</div>;
}

export function CommandEmpty({ children = "No results found." }) {
  return <div className="text-gray-500 px-2 py-1">{children}</div>;
}