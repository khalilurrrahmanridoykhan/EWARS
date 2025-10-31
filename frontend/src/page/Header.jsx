import { useEffect, useRef, useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import { FaUserCircle } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import { Link, useLocation } from "react-router-dom";
import { GrDocumentPerformance } from "react-icons/gr";

const diseases = [
    { name: "Malaria", key: "malaria" },
    { name: "Dengue", key: "dengue" },
    { name: "AWD", key: "awd" }
];
const riskOptions = {
    malaria: [
        { name: "District", href: "/malaria/risk-map/district" },
        { name: "Upazila", href: "/malaria/risk-map/upazila" },
        { name: "Community", href: "/malaria/risk-map/community" }
    ],
    dengue: [{ name: "District", href: "/risk-map/district" }],
    awd: [{ name: "Surv Site", href: "/risk-map/surv" }]
};
const predictionOptions = {
    malaria: [
        {
            name: "Species",
            subItems: [
                { name: "District", href: "/malaria/predict/species/district" },
                { name: "Upazila", href: "/malaria/predict/species/upazila" }
            ]
        },
        {
            name: "Change",
            subItems: [
                { name: "District", href: "/malaria/predict/change/district" },
                { name: "Upazila", href: "/malaria/predict/change/upazila" }
            ]
        }
    ],
    dengue: [{ name: "District", href: "/prediction/dengue" }],
    awd: [{ name: "Surv Site", href: "/prediction/awd" }]
};

const alertOptions = {
    malaria: [{ name: "Upazila", href: "/alert/malaria" }],
    dengue: [{ name: "District", href: "/alert/dengue" }],
    awd: [{ name: "Surv Site", href: "/alert/awd" }]
};

const navItemsBase = [
    // Removed Data from here
    {
        name: "Diseases",
        children: diseases.map(d => ({ name: d.name, key: d.key }))
    },
    { name: "Monitor", children: [{ name: "CDS", href: "/chw_cds" }] }
];

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(null); // open parent menu
    const [openPredictionSub, setOpenPredictionSub] = useState(null); // open sub-panel
    const [selectedDisease, setSelectedDisease] = useState("malaria");
    const location = useLocation();
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const avatarMenuRef = useRef();

    useEffect(() => {
        const handler = (e) => {
            if (avatarMenuOpen && avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
                setAvatarMenuOpen(false);
            }
        };
        window.addEventListener("mousedown", handler);
        return () => window.removeEventListener("mousedown", handler);
    }, [avatarMenuOpen]);

    const navItems = [
        {
            ...navItemsBase[0],
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
                        <div className="absolute text-[12px] z-[999] mt-2 bg-white text-black rounded-lg shadow-lg w-48 ">
                            {diseases.map(d => (
                                <button
                                    key={d.key}
                                    onClick={() => {
                                        setSelectedDisease(d.key);
                                        setDropdownOpen(null);
                                    }}
                                    className="flex text-[12px] items-center justify-between w-full px-4 py-2 text-base hover:bg-gray-100"
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
        navItemsBase[1] // Monitor
    ];

    const currentPath = location.pathname;
    let activeParent = null;
    let activeChild = null;

    navItems.forEach((item) => {
        if (item.href && currentPath.startsWith(item.href)) {
            activeParent = item.name;
        }
        if (item.children) {
            item.children.forEach((child) => {
                if (child.href && currentPath.startsWith(child.href)) {
                    activeParent = item.name;
                    activeChild = child.name;
                }
                // Check for subItems (malaria prediction)
                if (child.subItems) {
                    child.subItems.forEach(sub => {
                        if (sub.href && currentPath.startsWith(sub.href)) {
                            activeParent = item.name;
                            activeChild = sub.name;
                        }
                    });
                }
            });
        }
    });


    return (
        <header className="bg-[#004bad] text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                <div className="font-bold text-xl tracking-wide">CSD EWARS</div>

                {/* Desktop Nav */}
                <nav className="hidden text-[14px] md:flex space-x-6 items-center text-md">
                    {navItems.map((item) =>
                        item.render ? (
                            <div key={item.name}>{item.render()}</div>
                        ) : item.name === "Prediction" && selectedDisease === "malaria" ? (
                            <div key={item.name} className="relative">
                                <button
                                    onClick={() => {
                                        setDropdownOpen(dropdownOpen === item.name ? null : item.name);
                                        setOpenPredictionSub(null);
                                    }}
                                    className={`px-4 py-2 rounded-lg transition ${activeParent === item.name
                                        ? "bg-white text-black"
                                        : "hover:bg-blue-600 rounded-lg"
                                        } cursour-pointer`}
                                >
                                    {item.name}
                                </button>
                                {dropdownOpen === item.name && (
                                    <div
                                        className="absolute text-[12px] z-[9999] mt-2 bg-white text-black rounded-lg shadow-lg min-w-[180px]"
                                        style={{ minWidth: '180px' }}
                                    >
                                        {predictionOptions.malaria.map((opt) => (
                                            <div key={opt.name} className="group relative">
                                                <button
                                                    onClick={() => setOpenPredictionSub(openPredictionSub === opt.name ? null : opt.name)}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                                                >
                                                    {opt.name}
                                                </button>
                                                {/* Show side panel if this is open */}
                                                {openPredictionSub === opt.name && (
                                                    <div className="absolute left-full top-2 left-4 bg-white text-black shadow-lg rounded-lg min-w-[140px]  z-[9999]">
                                                        {opt.subItems.map((sub) => (
                                                            <Link
                                                                key={sub.name}
                                                                to={sub.href}
                                                                onClick={() => {
                                                                    setDropdownOpen(null);
                                                                    setOpenPredictionSub(null);
                                                                }}
                                                                className="block px-4 py-2 hover:bg-blue-100 rounded"
                                                            >
                                                                {sub.name}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : item.children ? (
                            <div key={item.name} className="relative">
                                <button
                                    onClick={() => setDropdownOpen(dropdownOpen === item.name ? null : item.name)}
                                    className={`px-4 py-2 rounded-md transition ${activeParent === item.name
                                        ? "bg-white text-black"
                                        : "hover:bg-blue-600"
                                        } cursour-pointer`}
                                >
                                    {item.name}
                                </button>
                                {dropdownOpen === item.name && (
                                    <div className="absolute text-[12px] z-[9999] mt-2 bg-white text-black rounded-lg shadow-lg w-48 ">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.name}
                                                to={child.href}
                                                onClick={() => setDropdownOpen(null)}
                                                className="flex cursour-pointer text-[12px] items-center justify-between w-full px-4 py-2 text-base hover:bg-gray-100 hover:rounded-lg"
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
                        ) : null
                    )}
                </nav>


                {/* Desktop Profile Menu */}
                <div className="hidden md:block relative" ref={avatarMenuRef}>
                    <FaUserCircle
                        className="text-3xl cursor-pointer hover:text-gray-200"
                        onClick={() => setAvatarMenuOpen((s) => !s)}
                    />
                    {avatarMenuOpen && (
                        <div className="absolute right-0 mt-3 w-48 bg-white text-black rounded shadow z-[9999] py-2">
                            {/* Added Data link to profile menu */}
                            <Link
                                to="/data"
                                className="block w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                                onClick={() => setAvatarMenuOpen(false)}
                            >
                                Data
                            </Link>
                            <Link
                                to="/model"
                                className="block w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                                onClick={() => setAvatarMenuOpen(false)}
                            >
                                Mechanism of Model
                            </Link>
                            <Link
                                to="/model-performance"
                                className="block w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                                onClick={() => setAvatarMenuOpen(false)}
                            >
                                Model Performance
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
                        item.render ? null :
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

                                    {/* Special handling for malaria prediction with subItems */}
                                    {dropdownOpen === item.name && (
                                        <div className="bg-blue-700">
                                            {item.children.map((child) =>
                                                child.subItems ? (
                                                    <div key={child.name}>
                                                        <button
                                                            className="w-full text-left px-6 py-2 font-normal text-white focus:outline-none"
                                                            onClick={() => setOpenPredictionSub(openPredictionSub === child.name ? null : child.name)}
                                                        >
                                                            {child.name}
                                                        </button>
                                                        {openPredictionSub === child.name && (
                                                            <div className="ml-3 bg-blue-800 rounded-lg py-1">
                                                                {child.subItems.map(sub => (
                                                                    <Link
                                                                        key={sub.name}
                                                                        to={sub.href}
                                                                        onClick={() => {
                                                                            setDropdownOpen(null);
                                                                            setMenuOpen(false);
                                                                            setOpenPredictionSub(null);
                                                                        }}
                                                                        className="block px-8 py-1 text-white hover:bg-blue-600 rounded"
                                                                    >
                                                                        {sub.name}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
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
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null // No Data here
                    )}

                    {/* Mobile profile menu (bottom of menu) */}
                    <div className="border-t border-blue-400 py-3 px-4">
                        <div className="flex flex-col gap-2">
                            <Link
                                to="/data"
                                className="flex items-center gap-2 px-3 py-2 rounded bg-white text-[#004bad] font-normal text-[15px] transition hover:bg-blue-50 shadow-sm"
                                onClick={() => setMenuOpen(false)}
                            >
                                <FaUserCircle className="text-xl" />
                                Data & Upload
                            </Link>
                            <Link
                                to="/model"
                                className="flex items-center gap-2 px-3 py-2 rounded bg-white text-[#004bad] font-normal text-[15px] transition hover:bg-blue-50 shadow-sm"
                                onClick={() => setMenuOpen(false)}
                            >
                                <FaCheck className="text-xl" />
                                Mechanism of Model
                            </Link>

                            <Link
                                to="/model-performance"
                                className="flex items-center gap-2 px-3 py-2 rounded bg-white text-[#004bad] font-normal text-[15px] transition hover:bg-blue-50 shadow-sm"
                                onClick={() => setMenuOpen(false)}
                            >
                                <GrDocumentPerformance className="text-xl" />
                                Model Performance
                            </Link>
                        </div>
                    </div>

                </div>
            )}
        </header>
    );
}
