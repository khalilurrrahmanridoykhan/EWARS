import React, { useRef, useState } from "react";
import { FaFileCsv, FaFileArchive, FaLink, FaShareAlt, FaEye, FaEllipsisV, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "sonner";

const demoData = [
    { title: "Demo Row 1", type: "Xlsx file", modified: "2025-09-07" },
    { title: "Demo Row 2", type: "Shapefile", modified: "2025-09-06" },
    { title: "Demo Row 3", type: "API link", modified: "2025-09-05" },
    { title: "Demo Row 4", type: "Shapefile", modified: "2025-09-04" },
];



export default function DataPage() {
    const [menuOpen, setMenuOpen] = useState(null);

    const handleUpload = (data) => {
        if (!data || (typeof data === "string" && !data)) alert("No file or URL selected");
        else alert(`Uploading "${typeof data === "string" ? data : data.name}" (simulated)`);
    };

    return (
        <div className="flex flex-col lg:flex-row  bg-gray-50">
            {/* Upload Panel */}
            <div className="lg:w-1/3 w-full p-4 flex flex-col bg-blue-50 border-r">
                <FileUploadPanel
                    title="Upload Data File (CSV/XLSX)"
                    accept=".csv,.xlsx"
                    icon={<FaFileCsv size={22} />}
                    onUpload={handleUpload}
                />
                <FileUploadPanel
                    title="Upload Shapefile (ZIP)"
                    accept=".zip"
                    icon={<FaFileArchive size={22} />}
                    onUpload={handleUpload}
                />
                <FileUploadPanel
                    title="Connect API"
                    isUrl
                    icon={<FaLink size={22} />}
                    onUpload={handleUpload}
                />
            </div>
            {/* Table Panel */}
            <div className="lg:w-2/3 w-full p-4 overflow-x-auto">
                <h2 className="text-xl font-bold mb-4 text-blue-900">Data Table</h2>
                <table className="min-w-full rounded-lg shadow border border-gray-200 bg-white">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">Title</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Modified</th>
                            <th className="px-2 py-3 text-center font-medium">Share</th>
                            <th className="px-2 py-3 text-center font-medium">Preview</th>
                            <th className="px-2 py-3 text-center font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {demoData.map((row, idx) => (
                            <tr key={idx} className="border-t hover:bg-blue-50 group relative">
                                <td className="px-4 py-3">{row.title}</td>
                                <td className="px-4 py-3">{row.type}</td>
                                <td className="px-4 py-3">{row.modified}</td>
                                {/* Share Button */}
                                <td className="px-2 py-3 text-center">
                                    <button className="text-blue-500 hover:text-blue-700" title="Share"><FaShareAlt className="w-6 h-6" /></button>
                                </td>
                                {/* Preview Button */}
                                <td className="px-2 py-3 text-center">
                                    <button className="text-green-500 hover:text-green-700" title="Preview"><FaEye className="w-6 h-6" /></button>
                                </td>
                                {/* Actions Dropdown */}
                                <td className="px-2 py-3 text-center relative">
                                    <button
                                        className="text-gray-500 hover:text-gray-700"
                                        onClick={() => setMenuOpen(menuOpen === idx ? null : idx)}
                                    >
                                        <FaEllipsisV />
                                    </button>
                                    {menuOpen === idx && (
                                        <div
                                            className="absolute right-0 top-8 z-50 bg-white border border-gray-200 shadow-md rounded w-28 text-left"
                                            onMouseLeave={() => setMenuOpen(null)}
                                        >
                                            <button className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 text-sm text-gray-700" onClick={() => { alert('Edit clicked'); setMenuOpen(null); }}>
                                                <FaEdit /> Edit
                                            </button>
                                            <button className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 text-sm text-red-600" onClick={() => { alert('Delete clicked'); setMenuOpen(null); }}>
                                                <FaTrash /> Delete
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FileUploadPanel({ title, accept, icon, onUpload, isUrl }) {
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef();

    // Parse the accept string into allowed extensions
    const allowed = accept ? accept.split(",").map(ext => ext.trim().replace(".", "").toLowerCase()) : [];

    const validateFile = (file) => {
        if (!accept) return true; // No restriction
        const name = file.name || "";
        const ext = name.split(".").pop().toLowerCase();
        if (!allowed.includes(ext)) {
            toast.error(`Only files of type: ${accept} are allowed`);
            return false;
        }
        return true;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && validateFile(file)) {
            setFile(file);
        } else {
            setFile(null);
            e.target.value = null; // reset
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (["dragenter", "dragover"].includes(e.type)) setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) {
                setFile(file);
            } else {
                setFile(null);
            }
        }
    };

    const handleClick = () => inputRef.current && inputRef.current.click();

    return (
        <div className="w-full mb-6 last:mb-0">
            <div className="mb-2 flex items-center gap-2 text-blue-900 font-bold text-base">
                {icon}
                <span>{title}</span>
            </div>
            <form
                className={`w-full border-2 border-dashed rounded-lg p-4 bg-white flex flex-col items-center transition-all duration-150 ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
                onDragEnter={e => !isUrl && handleDrag(e)}
                onDragOver={e => !isUrl && handleDrag(e)}
                onDragLeave={e => !isUrl && handleDrag(e)}
                onDrop={e => !isUrl && handleDrop(e)}
                onClick={() => !isUrl && handleClick()}
            >
                {!isUrl ? (
                    <>
                        <input
                            type="file"
                            accept={accept}
                            ref={inputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center cursor-pointer select-none pointer-events-none">
                            <span className="text-blue-500 mb-1">{icon}</span>
                            <span className="font-medium text-gray-700">Drag & drop or click to select</span>
                            <span className="text-gray-400 text-xs mt-1">({accept})</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-2 h-5">
                            {file ? `Selected: ${file.name}` : "No file selected"}
                        </div>
                    </>
                ) : (
                    <input
                        type="text"
                        placeholder="Paste API link here"
                        className="w-full border rounded p-2 focus:outline-none"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                    />
                )}
            </form>
            <button
                className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded w-full font-semibold shadow"
                onClick={() => onUpload(isUrl ? url : file)}
            >
                Upload
            </button>
        </div>
    );
}
