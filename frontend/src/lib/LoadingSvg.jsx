import React from "react";

const LoadingSvg = () => (
    <div
        style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
            minHeight: "200px",
        }}
    >
        <img
            src="/loading-svg.svg"
            alt="Loading..."
            style={{ width: "96px", height: "96px" }}
        />
    </div>
);

export default LoadingSvg;