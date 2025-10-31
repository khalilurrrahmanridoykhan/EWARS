import React from 'react';

function ModelPerformance() {
    return (
        <div className="min-h-screen  flex flex-col items-center p-4">
            <h1 className="text-2xl font-bold mb-8 tracking-tight">Model Performance</h1>

            {/* Malaria Card */}
            <div className="w-full max-w-xl bg-white border border-black/30 rounded-lg p-6 mb-6">
                <div className="flex justify-between mb-4">
                    <span className="text-lg font-semibold">Malaria</span>
                    <span className="text-xs text-gray-400">Last trained: 11/12/2025</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2">
                    <Metric label="Accuracy" value="88%" trend="down" />
                    <Metric label="Precision" value="90%" trend="up" />
                    <Metric label="Specificity" value="86%" trend="down" />
                    <Metric label="MAE" value="0.1" trend="up" />
                    <Metric label="RMSE" value="0.3" trend="down" />
                    <Metric label="R-square" value="0.98" trend="up" />
                </div>
            </div>

            {/* Other Disease Cards */}
            <DiseaseCard name="Dengue" />
            <DiseaseCard name="AWD" />
            <DiseaseCard name="TB" />
        </div>
    );
}

function DiseaseCard({ name }) {
    return (
        <div className="w-full max-w-xl bg-gray-100 rounded-lg border border-gray-200 p-6 mb-4">
            <span className="text-lg font-semibold text-gray-600">{name}</span>
        </div>
    );
}

function Metric({ label, value, trend }) {
    const color = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-600';
    const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
    return (
        <div className="flex flex-col items-start">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-base font-medium ${color}`}>
                {value} {arrow && <span>{arrow}</span>}
            </span>
        </div>
    );
}

export default ModelPerformance;
