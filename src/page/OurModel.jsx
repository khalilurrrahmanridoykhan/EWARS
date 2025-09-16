import React from 'react'

// Put your image in public/ as model-architecture.png (or any name)
// Put your PDF in public/ as model-details.pdf (or any name)

function OurModel() {
    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">Mechanism of CSD EWARS</h1>
            <img
                src="/our_model.png" // replace with your actual image filename
                alt="our model architecture"
                className="w-full rounded shadow mb-6"
                style={{ maxHeight: 420, objectFit: 'contain', background: "#fcfcfc" }}
            />
            <div className="flex justify-center">
                <a
                    href="/CSD_EWARS_Pipeline.pdf" // replace with your actual pdf filename
                    download
                    className="bg-[#004bad] hover:bg-blue-700 text-white px-8 py-2 rounded shadow-lg font-medium text-lg transition"
                    target="_blank" rel="noopener noreferrer"
                >
                    Download PDF
                </a>
            </div>
        </div>
    );
}

export default OurModel
