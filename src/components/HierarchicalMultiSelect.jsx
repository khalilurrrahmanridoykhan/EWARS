import React, { useState, useRef, useEffect } from "react";

export default function HierarchicalMultiSelect({
    label,
    options,
    selected,
    setSelected,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target))
                setOpen(false);
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        setSelected(
            selected.includes(option)
                ? selected.filter((v) => v !== option)
                : [...selected, option]
        );
    };

    const selectAll = () => setSelected([...filteredOptions]);
    const deselectAll = () => setSelected([]);

    const displaySelected = () => {
        if (!selected.length) return "Select...";
        if (selected.length <= 3) return selected.join(", ");
        return selected.slice(0, 3).join(", ") + `, ...${selected.length - 3} more`;
    };

    // Filter options by search for all sidebar menus
    const filteredOptions = searchValue
        ? options.filter(
            (opt) => opt && opt.toLowerCase().includes(searchValue.toLowerCase())
        )
        : options;

    return (
        <div className="relative flex flex-col w-full" ref={containerRef}>
            <label className="block mb-1 text-sm font-medium text-black">{label}</label>
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full bg-white text-black px-3 py-2 rounded-md border border-gray-300 flex justify-between items-center shadow-sm hover:border-gray-500 transition-colors text-sm ${disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                disabled={disabled}
            >
                <span className="truncate">{displaySelected()}</span>
                {!disabled && (
                    <svg
                        className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""
                            }`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                )}
            </button>

            {open && !disabled && (
                <div className="absolute z-10 mt-1 w-full bg-white text-black rounded-md border border-gray-300 shadow-lg max-h-60 overflow-auto">
                    <div className="flex  justify-between px-3 py-2 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={selectAll}
                            className="text-xs text-gray-600 hover:underline"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={deselectAll}
                            className="text-xs text-gray-600 hover:underline"
                        >
                            Deselect All
                        </button>
                    </div>
                    <div className="px-3 py-2">
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder={`Search ${label.toLowerCase()}...`}
                            className="w-full text-sm px-2 py-1 rounded-md bg-gray-100 text-black border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <ul>
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-gray-400">No options</li>
                        ) : (
                            filteredOptions.map((option) => (
                                <li
                                    key={option}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                >
                                    <label className="flex items-center w-full cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(option)}
                                            onChange={() => toggleOption(option)}
                                            className="mr-2 accent-black"
                                        />
                                        {option}
                                    </label>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
