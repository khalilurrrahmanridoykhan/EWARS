import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import { FaUserCircle } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import { Link, useLocation } from "react-router-dom";

const navItems = [
    { name: "Data", href: "/data" },
    {
        name: "Diseases",
        children: [
            { name: "Malaria", href: "/diseases/malaria" },
            { name: "Dengue", href: "/diseases/dengue" },
            { name: "AWD", href: "/diseases/awd" },
        ],
    },
    {
        name: "Risk Map",
        children: [
            { name: "Upazila", href: "/risk-map/upazila" },
            { name: "Community", href: "/risk-map/community" },
        ],
    },
    {
        name: "Prediction",
        children: [
            { name: "District", href: "/prediction/district" },
            { name: "Upazila", href: "/prediction/upazila" },
        ],
    },
    { name: "Alert", href: "/alert" },
];

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const location = useLocation();

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
                        item.children ? (
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

                {/* User Icon */}
                <div className="hidden md:block">
                    <FaUserCircle className="text-3xl cursor-pointer hover:text-gray-200" />
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
                    {navItems.map((item) =>
                        item.children ? (
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
