#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL =
  "https://api.allorigins.win/get?url=https://lmis.nmcp.gov.bd/admin/mis-api-data";
const OUTPUT_FILE = path.join(__dirname, "..", "public", "lmis-data.json");

async function fetchLMISData(retryCount = 0) {
  const maxRetries = 3;

  try {
    console.log(
      `Fetching data from LMIS API... (attempt ${retryCount + 1}/${
        maxRetries + 1
      })`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    const response = await fetch(API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EWARS-Bot/1.0)",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();

    // Check if response contains bot protection message
    if (
      rawData &&
      typeof rawData === "object" &&
      rawData.message &&
      rawData.message.includes("bot-protection")
    ) {
      throw new Error(`API blocked by bot protection: ${rawData.message}`);
    }

    // Handle allorigins.win response format
    let data;
    if (rawData && rawData.contents) {
      try {
        data = JSON.parse(rawData.contents);
      } catch (parseError) {
        throw new Error(
          `Failed to parse allorigins response: ${parseError.message}`
        );
      }
    } else {
      data = rawData;
    }

    // Validate that data is an array
    if (!Array.isArray(data)) {
      throw new Error("API returned non-array data after parsing");
    }

    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(
      `Data saved to ${OUTPUT_FILE}. ${data.length} records fetched.`
    );
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Request timed out");
    } else {
      console.error("Error fetching LMIS data:", error.message);
    }

    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds... (${retryCount + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return fetchLMISData(retryCount + 1);
    } else {
      console.error("Max retries reached. Exiting.");
      process.exit(1);
    }
  }
}

fetchLMISData();
