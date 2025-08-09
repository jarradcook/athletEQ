import * as React from "react";

export function Combobox({ options, value, onChange, placeholder }) {
  const [query, setQuery] = React.useState("");
  const [showOptions, setShowOptions] = React.useState(false);

  console.log("Incoming options:", options);

  const filteredOptions = (options || []).filter((option) => {
    const label = (option.label || option.value || "").toString();
    return label.toLowerCase().includes(query.toLowerCase());
  });

  console.log("Filtered options:", filteredOptions);

  const handleSelect = (option) => {
    onChange(option);
    setQuery(option.label || option.value);
    setShowOptions(false);
  };

  React.useEffect(() => {
    const selected = options.find((o) => o.value === value);
    if (selected) setQuery(selected.label || selected.value);
  }, [value, options]);

  return (
    <div
      className="relative w-full"
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowOptions(true);
        }}
        onFocus={() => setShowOptions(true)}
        onBlur={() => setTimeout(() => setShowOptions(false), 100)}
        placeholder={placeholder || "Select a horse"}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "12px 16px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "1rem",
          outline: "none",
          backgroundColor: "white",
          color: "#1B3A66",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        }}
      />

      {showOptions && filteredOptions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            marginTop: "4px",
            left: 0,
            right: 0,
            maxWidth: "400px",
            zIndex: 10,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            maxHeight: "220px",
            overflowY: "auto",
            padding: 0,
            listStyle: "none",
            alignSelf: "center",
          }}
        >
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onMouseDown={() => handleSelect(option)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F0F8FF")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {option.label || option.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}