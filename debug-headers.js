import Papa from 'papaparse';

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2mSHZRiGUWzVlnuHWSpNDdUPDSJH94zMwTPcX0ude9nylJ0-GIcd3zlEpgeGKu0eCyEXLw1nXm0HH/pub?gid=0&single=true&output=csv";

async function debugHeaders() {
    try {
        const fetchUrl = new URL(GOOGLE_SHEET_URL);
        fetchUrl.searchParams.set('t', Date.now().toString());

        console.log("Fetching CSV...");
        const response = await fetch(fetchUrl.toString());
        const csvText = await response.text();

        console.log("Raw CSV first 200 chars:");
        console.log(JSON.stringify(csvText.substring(0, 200)));

        const { meta, data } = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        console.log("\nDetected Headers:");
        console.log(meta.fields);

        if (data.length > 0) {
            console.log("\nFirst Row Keys:");
            console.log(Object.keys(data[0]));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

debugHeaders();
