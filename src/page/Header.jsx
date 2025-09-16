import { useEffect, useRef, useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import { FaUserCircle } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import { Link, useLocation } from "react-router-dom";

// Disease menu logic
const diseases = [
    { name: "Malaria", key: "malaria" },
    { name: "Dengue", key: "dengue" },
    { name: "AWD", key: "awd" }
];
// Per-disease dropdown options
const riskOptions = {
    malaria: [
        { name: "Upazila", href: "/risk-map/upazila" },
        { name: "Community", href: "/risk-map/community" }
    ],
    dengue: [{ name: "District", href: "/risk-map/district" }],
    awd: [{ name: "Surv Site", href: "/risk-map/surv" }]
};
const predictionOptions = {
    malaria: [{ name: "Upazila", href: "/diseases/predict/malaria" }],
    dengue: [{ name: "District", href: "/prediction/dengue" }],
    awd: [{ name: "Surv Site", href: "/prediction/awd" }]
};
const alertOptions = {
    malaria: [{ name: "Upazila", href: "/alert/malaria" }],
    dengue: [{ name: "District", href: "/alert/dengue" }],
    awd: [{ name: "Surv Site", href: "/alert/awd" }]
};

const navItemsBase = [
    { name: "Data", href: "/data" },
    {
        name: "Diseases", // This is now the disease picker (UI-only, not nav)
        children: diseases.map(d => ({ name: d.name, key: d.key }))
    },
    { name: "Monitor", children: [{ name: "CDS", href: "/chw_cds" }] }
];


export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [selectedDisease, setSelectedDisease] = useState("malaria");
    const location = useLocation();

    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const avatarMenuRef = useRef();


    useEffect(() => {
        const handler = (e) => {
            // close menu if clicking outside
            if (avatarMenuOpen && avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
                setAvatarMenuOpen(false);
            }
        };
        window.addEventListener("mousedown", handler);
        return () => window.removeEventListener("mousedown", handler);
    }, [avatarMenuOpen]);


    const navItems = [
        ...navItemsBase.slice(0, 1), // Data
        {
            ...navItemsBase[1],
            // Render disease menu with select logic
            render: () => (
                <div className="relative z-[9999]">
                    <button
                        onClick={() => setDropdownOpen(dropdownOpen === "Diseases" ? null : "Diseases")}
                        className={`px-4 py-2 rounded-md transition ${dropdownOpen === "Diseases" ?
                            "bg-white text-black" : "hover:bg-blue-600"} cursour-pointer`}
                    >
                        Diseases
                    </button>
                    {dropdownOpen === "Diseases" && (
                        <div className="absolute z-[999] mt-2 bg-white text-black rounded-lg shadow-lg w-48 ">
                            {diseases.map(d => (
                                <button
                                    key={d.key}
                                    onClick={() => {
                                        setSelectedDisease(d.key);
                                        setDropdownOpen(null);
                                    }}
                                    className="flex items-center justify-between w-full px-4 py-2 text-base hover:bg-gray-100"
                                >
                                    {d.name}
                                    {selectedDisease === d.key && <FaCheck className="text-green-600 ml-2" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )
        },
        {
            name: "Risk Map",
            children: riskOptions[selectedDisease]
        },
        {
            name: "Prediction",
            children: predictionOptions[selectedDisease]
        },
        {
            name: "Alert",
            children: alertOptions[selectedDisease]
        },
        navItemsBase[2] // Monitor
    ];


    // Find active parent & child based on current URL
    const currentPath = location.pathname;
    let activeParent = null;
    let activeChild = null;

    navItems.forEach((item) => {
        if (item.href && currentPath.startsWith(item.href)) {
            activeParent = item.name;
        }
        if (item.children) {
            item.children.forEach((child) => {
                if (currentPath.startsWith(child.href)) {
                    activeParent = item.name;
                    activeChild = child.name;
                }
            });
        }
    });


    return (
        <header className="bg-[#004bad] text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                <div className="font-bold text-xl tracking-wide">CSD EWARS</div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex space-x-6 items-center text-lg">
                    {navItems.map((item) =>
                        item.render ? (
                            // Special Diseases go here (render: function returns element)
                            <div key={item.name}>{item.render()}</div>
                        ) : item.children ? (
                            <div key={item.name} className="relative">
                                <button
                                    onClick={() =>
                                        setDropdownOpen(dropdownOpen === item.name ? null : item.name)
                                    }
                                    className={`px-4 py-2 rounded-md transition ${activeParent === item.name
                                        ? "bg-white text-black"
                                        : "hover:bg-blue-600"
                                        } cursour-pointer`}
                                >
                                    {item.name}
                                </button>
                                {dropdownOpen === item.name && (
                                    <div className="absolute z-[999] mt-2 bg-white text-black rounded-lg shadow-lg w-48 ">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.name}
                                                to={child.href}
                                                onClick={() => setDropdownOpen(null)}
                                                className="flex cursour-pointer items-center justify-between w-full px-4 py-2 text-base hover:bg-gray-100"
                                            >
                                                {child.name}
                                                {activeChild === child.name && (
                                                    <FaCheck className="text-green-600" />
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`px-4 py-2 rounded-md cursor-pointer transition ${activeParent === item.name
                                    ? "bg-white text-black"
                                    : "hover:bg-blue-600"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        )
                    )}
                </nav>

                <div className="hidden md:block relative" ref={avatarMenuRef}>
                    <FaUserCircle
                        className="text-3xl cursor-pointer hover:text-gray-200"
                        onClick={() => setAvatarMenuOpen((s) => !s)}
                    />
                    {avatarMenuOpen && (
                        <div className="absolute right-0 mt-3 w-48 bg-white text-black rounded shadow z-50 py-2">
                            <Link
                                to="/model"
                                className="block w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                                onClick={() => setAvatarMenuOpen(false)}
                            >
                                About Our Model
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-3xl"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <HiX /> : <HiMenu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden bg-blue-600 text-lg">
                    {/* Disease Picker for Mobile */}
                    <div className="border-t border-blue-500 flex px-4 py-3 gap-3">
                        <span className="font-semibold text-white">Disease:</span>
                        {diseases.map(d => (
                            <button
                                key={d.key}
                                onClick={() => {
                                    setSelectedDisease(d.key);
                                    setDropdownOpen(null);
                                }}
                                className={`px-3 py-1 rounded transition text-base ${selectedDisease === d.key ? "bg-white text-[#004bad]" : "hover:bg-white hover:text-[#004bad]"}`}
                            >
                                {d.name}
                            </button>
                        ))}
                    </div>
                    {navItems.map((item) =>
                        item.render ? (
                            // skip diseases picker - already rendered above in mobile
                            null
                        ) : item.children ? (
                            <div key={item.name} className="border-t border-blue-500">
                                <button
                                    onClick={() =>
                                        setDropdownOpen(dropdownOpen === item.name ? null : item.name)
                                    }
                                    className={`block w-full text-left px-4 py-3 transition ${activeParent === item.name
                                        ? "bg-green-500 text-white"
                                        : "hover:bg-blue-500"
                                        }`}
                                >
                                    {item.name}
                                </button>
                                {dropdownOpen === item.name && (
                                    <div className="bg-blue-700">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.name}
                                                to={child.href}
                                                onClick={() => {
                                                    setDropdownOpen(null);
                                                    setMenuOpen(false);
                                                }}
                                                className="flex items-center justify-between w-full px-6 py-2 hover:bg-blue-500"
                                            >
                                                {child.name}
                                                {activeChild === child.name && (
                                                    <FaCheck className="text-green-300" />
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setMenuOpen(false)}
                                className={`block w-full text-left px-4 py-3 transition ${activeParent === item.name
                                    ? "bg-green-500 text-white"
                                    : "hover:bg-blue-500"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        )
                    )}
                </div>
            )}
        </header>
    );
}
