require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const { createCanvas } = require('canvas');
const d3 = require('d3-geo');
const scale = require('d3-scale');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');




const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));


const STATIC_EMAILS = [
    "email1@example.com",
    "email2@example.com",
    "email3@example.com",
    "email4@example.com",
    "email5@example.com"
];

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
});

// POST /send-alert
app.post('/send-alert', async (req, res) => {
    const {
        subject = 'Prediction Alert',
        body = 'Prediction Alert Body',
        emails
    } = req.body;

    const recipients = Array.isArray(emails) && emails.length > 0 ? emails : STATIC_EMAILS;

    try {
        await transporter.sendMail({
            from: `"CDS EWARS alert" <${process.env.EMAIL_USER}>`,
            to: recipients.join(','),
            subject,
            html: body // can be plain string or HTML
        });
        res.json({ success: true, message: `Alert sent to: ${recipients.join(", ")}` });
    } catch (err) {
        console.error('SendMail error', err);
        res.status(500).json({ success: false, message: 'Failed to send alert', error: err.message });
    }
});


// HTML -> PDF using inline SVG maps 
app.post("/generate-report-inline", async (req, res) => {
    try {
        const { month, predictions, regionGeojson } = req.body;
        if (!predictions || !Array.isArray(predictions)) {
            return res.status(400).send("Invalid data");
        }

        // Build UpazilaID -> properties index from GeoJSON
        const idToProps = {};
        try {
            (regionGeojson?.features || []).forEach((f) => {
                const id = f?.properties?.UpazilaID ?? f?.properties?.upazila_id;
                if (id != null) idToProps[id] = f.properties || {};
            });
        } catch (_) { }

        const byType = (t) => predictions.filter((p) => p.type === t);
        const pv = byType("PV");
        const pf = byType("PF");
        const mixed = byType("MIXED");

        // Discrete color bins by absolute case count
        const colorFromCount = (c) => {
            if (!c || c <= 0) return "#ccc";        // 0
            if (c <= 10) return "#ffffb2";         // 1–10
            if (c <= 49) return "#fecc5c";         // 11–49
            if (c <= 99) return "#fd8d3c";         // 50–99
            if (c <= 199) return "#f03b20";        // 100–199
            return "#bd0026";                      // 200+
        };

        const makeColorMap = (arr) => {
            const map = {};
            arr.forEach((p) => {
                const id = Number(p.upazila_id ?? p.UpazilaID ?? p.upazilaid);
                const c = Number(p.pred_cases ?? p.predcases) || 0;
                if (!Number.isFinite(id)) return;
                map[id] = colorFromCount(c);
            });
            return map;
        };

        const maps = { pv: makeColorMap(pv), pf: makeColorMap(pf), mixed: makeColorMap(mixed) };

        // Table rows
        const rows = {};
        predictions.forEach((p) => {
            const id = Number(p.upazila_id ?? p.UpazilaID ?? p.upazilaid);
            if (!Number.isFinite(id)) return;
            if (!rows[id]) {
                const props = idToProps[id] || {};
                rows[id] = {
                    UpazilaID: id,
                    District: props.DIS_NAME || "-",
                    Upazila: props.UPA_NAME || String(id),
                    Pv: 0,
                    Pf: 0,
                    Mixed: 0,
                };
            }
            if (p.type === "PV") rows[id].Pv = Number(p.pred_cases) || 0;
            if (p.type === "PF") rows[id].Pf = Number(p.pred_cases) || 0;
            if (p.type === "MIXED") rows[id].Mixed = Number(p.pred_cases) || 0;
        });
        const table = Object.values(rows).map((r) => ({
            ...r,
            Case: r.Pv + r.Pf + r.Mixed,
            RiskStatus: r.Pv + r.Pf + r.Mixed > 150 ? "High" : (r.Pv + r.Pf + r.Mixed > 75 ? "Medium" : "Low"),
        })).sort((a, b) => a.Upazila.localeCompare(b.Upazila));

        const html = await ejs.renderFile(
            path.join(process.cwd(), "views", "report_svg.ejs"),
            {
                month: new Date(month).toLocaleString("default", { month: "long", year: "numeric" }),
                polygonsJSON: JSON.stringify(regionGeojson),
                pvJSON: JSON.stringify(maps.pv),
                pfJSON: JSON.stringify(maps.pf),
                mixedJSON: JSON.stringify(maps.mixed),
                rows: table,
            }
        );

        const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });
        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        // res.set({
        //     "Content-Type": "application/pdf",
        //     "Content-Disposition": "attachment; filename=malaria_ewars_report.pdf",
        // });
        //testign
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "inline; filename=malaria_ewars_report.pdf",
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to generate PDF");
    }
});



app.post('/generate-chw-xlsx', async (req, res) => {
    try {
        const {
            chwName = '',
            ward = [],
            union = [],
            upazila = [],
            district = [],
            submissions = []
        } = req.body || {};

        // ===== helpers / normalizers =====
        const toList = v => Array.isArray(v) ? v : (v ? String(v).split(/[,\s]+/).filter(Boolean) : []);
        const joinList = v => Array.isArray(v) ? v.join(', ') : String(v || '');
        const isYes = v => String(v || '').trim().toLowerCase() === 'yes';
        const num = v => { const x = Number(v); return Number.isFinite(x) ? x : null; };
        const eqi = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
        const inc = (s, kw) => String(s || '').toLowerCase().includes(String(kw).toLowerCase());

        const normalizeFacility = (raw) => {
            const v = String(raw || '').toLowerCase();
            if (!v) return '';
            if (inc(v, 'uhc')) return 'UHC';
            if (inc(v, 'district')) return 'District';
            if (inc(v, 'medical') || inc(v, 'college')) return 'Medical College Hospital';
            if (inc(v, 'brac')) return 'BRAC';
            if (inc(v, 'govt') || inc(v, 'government')) return 'Govt';
            if (inc(v, 'private') || inc(v, 'priv')) return 'Private';
            return raw;
        };

        // normalize submissions
        const N = submissions.map(s => {
            const diseaseArr = Array.isArray(s.disease) ? s.disease : toList(s.disease);
            return {
                date: s.day || s.date || '',
                hhid: s.hhid || '',
                hhheadname: s.hhheadname || '',
                mobilenumber: s.mobilenumber || '',
                name: s.nameofthepersonwithsuspectedcase || '',
                age: num(s.age),
                sex: (s.sex || '').toLowerCase(),
                preg: isYes(s.preg),
                susDengue: eqi(s.suspectedinthedisease, 'yes') && diseaseArr.some(d => eqi(d, 'dengue')),
                susAWD: eqi(s.suspectedinthedisease, 'yes') && diseaseArr.some(d => eqi(d, 'awd')),
                susMalaria: eqi(s.suspectedinthedisease, 'yes') && diseaseArr.some(d => eqi(d, 'malaria')),
                suspectedAny: eqi(s.suspectedinthedisease, 'yes'),
                referred: isYes(s.referred || s.referred_new),
                referralPlace: normalizeFacility(s.referralplace || s.referral_place || s.organization || ''),
                ifreferredtogovt: normalizeFacility(s.ifreferredtogovt || ''),
                diag_den: num(s.noofalreadydiagnosedcasesofdengueinthehh) || 0,
                diag_mal: num(s.noofalreadydiagnosedcasesofmalariainthehh) || 0,
                diag_awd: num(s.noofalreadydiagnosedcasesofawdinthehh) || 0,
                bednet: isYes(s.bednetusepracticeduringsleep),
                handwash: isYes(s.handwashingpracticewithsoapwater),
                latrine: s.typelatrineuse || '',
                stagnant: isYes(s.presenceofstagnantwatermosquitobreedingsites),
                larvae: (s.presenceofmosquitolarvae || '').toLowerCase(),
                disasterWeek: isYes(s.didanydisasteroccurinlast7days),
                remarks: s.remarks || ''
            };
        });

        // ===== summary aggregates (unchanged from previous answer) =====
        const hasDisease = name => r => r.suspectedAny && r.susMalaria && name === 'malaria'
            || r.suspectedAny && r.susAWD && name === 'awd'
            || r.suspectedAny && r.susDengue && name === 'dengue';
        const count = (pred, extra = () => true) => N.filter(x => pred(x) && extra(x)).length;
        const pack = (pred) => ({
            total: count(pred),
            male: count(pred, x => x.sex === 'male'),
            female: count(pred, x => x.sex === 'female'),
            preg: count(pred, x => x.preg),
            u5: count(pred, x => x.age !== null && x.age < 5),
        });
        const toUHC = r => r.referred && r.ifreferredtogovt === 'UHC';
        const toDist = r => r.referred && r.ifreferredtogovt === 'District';
        const toMCH = r => r.referred && r.ifreferredtogovt === 'Medical College Hospital';
        const toBRAC = r => r.referred && r.referralPlace === 'BRAC';
        const larvaeAedes = r => r.larvae === 'aedes';
        const larvaeAnophilis = r => r.larvae === 'anophilis';
        const hasSanitation = r => !!String(r.latrine).trim();

        const rows = [
            { label: "Number of the suspected dengue cases", calc: pack(hasDisease('dengue')) },
            { label: "Number of the suspected malaria cases", calc: pack(hasDisease('malaria')) },
            { label: "Number of the AWD cases", calc: pack(hasDisease('awd')) },
            { label: "Number of the suspected dengue cases Referred", calc: pack(r => hasDisease('dengue')(r) && r.referred) },
            { label: "Number of the AWD cases Referred", calc: pack(r => hasDisease('awd')(r) && r.referred) },
            { label: "Number of the suspected malaria cases Referred", calc: pack(r => hasDisease('malaria')(r) && r.referred) },
            { label: "Total number of the Referral to UHC (Dengue, Malaria, AWD)", calc: pack(toUHC) },
            { label: "Total number of the Referral to District (Dengue, Malaria, AWD)", calc: pack(toDist) },
            { label: "Total number of the Referral to Medical College Hospital (Dengue, Malaria, AWD)", calc: pack(toMCH) },
            { label: "Total number of referral to BRAC (Dengue, Malaria, AWD)", calc: pack(toBRAC) },
            { label: "Total No. of already diagnosed cases of Dengue in HH", calc: { total: N.reduce((a, b) => a + (b.diag_den || 0), 0), male: 0, female: 0, preg: 0, u5: 0 } },
            { label: "Total No. of already diagnosed cases of Malaria in HH", calc: { total: N.reduce((a, b) => a + (b.diag_mal || 0), 0), male: 0, female: 0, preg: 0, u5: 0 } },
            { label: "Total No. of already diagnosed cases of AWD in HH", calc: { total: N.reduce((a, b) => a + (b.diag_awd || 0), 0), male: 0, female: 0, preg: 0, u5: 0 } },
            { label: "Total Number of suspected individual using Bednet", calc: pack(r => r.bednet) },
            { label: "Total Number of suspected individual having Hand-washing practice", calc: pack(r => r.handwash) },
            { label: "Total Number of suspected individual having Safe Sanitation practice", calc: pack(hasSanitation) },
            { label: "Total Number of HH (surrounding areas) having stagnant water/ mosquito breeding sites", calc: { total: count(r => r.stagnant), male: 0, female: 0, preg: 0, u5: 0 } },
            { label: "Total Number of HH (surrounding areas) having Mosquito Larvae (Aedes)", calc: { total: count(larvaeAedes), male: 0, female: 0, preg: 0, u5: 0 } },
            { label: "Total Number of HH (surrounding areas) having Mosquito Larvae (Anophilis)", calc: { total: count(larvaeAnophilis), male: 0, female: 0, preg: 0, u5: 0 } },
            { label: "Areas experienced Flood/Cyclone/Any disaster event (within reported week)", calc: { total: count(r => r.disasterWeek), male: 0, female: 0, preg: 0, u5: 0 } },
        ];

        // ===== Excel workbook =====
        const wb = new ExcelJS.Workbook();

        // ---------- Sheet 1: Summary ----------
        const ws = wb.addWorksheet('CHW Surveillance', { views: [{ showGridLines: true }] });

        // title
        ws.mergeCells('A1:G1');
        ws.getCell('A1').value = 'CHW Recording for Community Disease Surveillance';
        ws.getCell('A1').font = { bold: true, size: 14 };
        ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

        // Name

        const nameRow = ws.addRow([`Name of CHW: ${chwName}`]);
        nameRow.getCell(1).font = { bold: true };
        nameRow.height = 20;

        ws.addRow([]);

        // *** NEW: independent 2-row section for Ward/Union/Upazila/District ***
        // Row 4: labels (merged), Row 5: values (merged). Each field occupies two columns for more room.
        // Layout: A-B = Ward, C-D = Union, E-F = Upazila, G-G = District (single col, merged vertically)
        ws.mergeCells('B4:C4');
        ws.mergeCells('E4:F4');
        ws.mergeCells('H4:I4');
        ws.mergeCells('K4:L4');

        ws.getCell('A4').value = 'Ward:'; ws.getCell('A4').font = { bold: true };
        ws.getCell('B4').value = Array.isArray(ward) ? ward.join(', ') : (ward || '');

        ws.getCell('D4').value = 'Union:'; ws.getCell('D4').font = { bold: true };
        ws.getCell('E4').value = Array.isArray(union) ? union.join(', ') : (union || '');

        ws.getCell('G4').value = 'Upazila:'; ws.getCell('G4').font = { bold: true };
        ws.getCell('H4').value = Array.isArray(upazila) ? upazila.join(', ') : (upazila || '');

        ws.getCell('J4').value = 'District:'; ws.getCell('J4').font = { bold: true };
        ws.getCell('K4').value = Array.isArray(district) ? district.join(', ') : (district || '');

        // optional: nicer row height + left align values
        ws.getRow(4).height = 22;
        ['B4', 'E4', 'H4', 'K4'].forEach(a => ws.getCell(a).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true });

        // spacer before the summary table
        ws.addRow([]);

        const header = ["Sl No", "Indicators", "Total", "Male", "Female", "Pregnant women", "U5 Children"];
        const hdr = ws.addRow(header);
        hdr.font = { bold: true };
        hdr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        hdr.height = 22;

        rows.forEach((r, i) => {
            ws.addRow([
                i + 1,
                r.label,
                r.calc.total || 0,
                r.calc.male || 0,
                r.calc.female || 0,
                r.calc.preg || 0,
                r.calc.u5 || 0
            ]);
        });

        const start = hdr.number, end = start + rows.length;
        for (let r = start; r <= end; r++) {
            for (let c = 1; c <= 7; c++) {
                const cell = ws.getRow(r).getCell(c);
                cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle', wrapText: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            }
        }
        ws.getColumn(1).width = 6;
        ws.getColumn(2).width = 70;
        ws.getColumn(3).width = 12;
        ws.getColumn(4).width = 12;
        ws.getColumn(5).width = 12;
        ws.getColumn(6).width = 16;
        ws.getColumn(7).width = 14;

        // ---------- Sheet 2: Line List ----------
        const ws2 = wb.addWorksheet('CHW-recording');
        const lineHeader = [
            "Date", "HH ID", "HH Head Name", "Mobile No", "Name of the person with suspected case",
            "Age", "Sex", "Pregnant: Y/N",
            "Suspected Dengue case: Y/N", "AWD case: Y/N", "Suspected Malaria case: Y/N",
            "Referred: Y/N", "Referral Place: Govt /BRAC/Private",
            "If referred to Govt: (UHC/District/Medical College Hospital)",
            "No. of already diagnosed cases of Dengue",
            "No. of already diagnosed cases of Malaria in the HH",
            "No. of already diagnosed cases of AWD in the HH",
            "Bed-net use practice during sleep: Y/N",
            "Hand-washing practice with Soap & Water: Y/N",
            "Type Latrine Use : (Flush Latrine/Pit Latrine/Hanging Toilet/Open Defecation)",
            "Presence of stagnant water/ mosquito breeding sites",
            "Presence of Mosquito Larvae (Aedes/Anophilis)",
            "Flood/Cyclone/Any disaster event (within this week)",
            "Follow up status (24-72 h): Diagnosis: Mal/Den/AWD/Others",
            "Remarks"
        ];
        const h2 = ws2.addRow(lineHeader);
        h2.font = { bold: true };
        h2.alignment = { wrapText: true, vertical: 'middle' };
        ws2.getRow(1).height = 36;

        const yn = b => (b ? 'Y' : 'N');

        N.forEach(r => {
            ws2.addRow([
                r.date || '',
                r.hhid,
                r.hhheadname,
                r.mobilenumber,
                r.name,
                r.age ?? '',
                r.sex,
                yn(r.preg),
                yn(r.susDengue),
                yn(r.susAWD),
                yn(r.susMalaria),
                yn(r.referred),
                r.referralPlace,
                r.ifreferredtogovt,
                r.diag_den,
                r.diag_mal,
                r.diag_awd,
                yn(r.bednet),
                yn(r.handwash),
                r.latrine,
                yn(r.stagnant),
                (r.larvae === 'aedes' ? 'Aedes' : r.larvae === 'anophilis' ? 'Anophilis' : r.larvae ? r.larvae : 'N'),
                yn(r.disasterWeek),
                "", // follow-up status (if you capture it later)
                r.remarks || ''
            ]);
        });

        // widths for line list (roughly sized)
        const widths = [12, 12, 22, 16, 28, 6, 8, 12, 16, 12, 20, 12, 20, 28, 10, 10, 10, 14, 18, 28, 26, 20, 18, 26, 24];
        widths.forEach((w, i) => ws2.getColumn(i + 1).width = w);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=CHW_Disease_Surveillance_Report.xlsx');
        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to generate XLSX report');
    }
});




app.get('/', (req, res) => res.send('Alert mailer is running!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Alert mailer running on port ${PORT}`));

