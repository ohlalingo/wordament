import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Button, Input, TextArea, Select } from "@adminjs/design-system";
const TYPES = [
    { value: "crossword", label: "Crossword" },
    { value: "wordsearch", label: "Wordsearch" },
    { value: "unjumble", label: "Unjumble" },
];
const LANGS = [
    { value: "en", label: "English" },
    { value: "ja", label: "Japanese" },
];
const ImportPage = () => {
    const [id, setId] = useState("");
    const [date, setDate] = useState("");
    const [type, setType] = useState("crossword");
    const [language, setLanguage] = useState("en");
    const [json, setJson] = useState("");
    const [busy, setBusy] = useState(false);
    const upload = async () => {
        if (!date.trim())
            return alert("Date is required (DDMMYYYY).");
        if (!id.trim())
            return alert("ID is required.");
        if (!json.trim())
            return alert("Paste puzzle JSON.");
        let parsed;
        try {
            parsed = JSON.parse(json);
        }
        catch (err) {
            return alert("JSON is invalid.");
        }
        const cleanDate = date.replace(/[^0-9]/g, "");
        if (cleanDate.length !== 8) {
            setBusy(false);
            return alert("Date must be DDMMYYYY.");
        }
        const day = cleanDate.slice(0, 2);
        const month = cleanDate.slice(2, 4);
        const year = cleanDate.slice(4);
        const isoDate = `${year}-${month}-${day}`;
        const item = { id, date: isoDate, type, language, content: parsed };
        setBusy(true);
        try {
            const res = await fetch("/api/import-puzzle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([item]),
            });
            const body = await res.json();
            if (!res.ok)
                throw new Error(body?.error || "Import failed");
            alert(`Imported ${body.imported ?? 0} puzzle(s)`);
            setId("");
            setDate("");
            setJson("");
        }
        catch (err) {
            alert(err.message || "Import failed");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs(Box, { variant: "white", p: "xl", style: { maxWidth: 900 }, children: [_jsx("h2", { style: { marginTop: 0 }, children: "Create Puzzle Content" }), _jsxs(Box, { display: "grid", gridTemplateColumns: "1fr 1fr", gridGap: "16px", mb: "lg", children: [_jsx(Input, { value: id, onChange: (e) => setId(e.target.value), placeholder: "ID (unique per language)", width: "100%" }), _jsx(Input, { value: date, onChange: (e) => setDate(e.target.value), placeholder: "Date (DDMMYYYY)", width: "100%" }), _jsx(Select, { value: type, onChange: (v) => setType(String(v || "crossword")), options: TYPES, variant: "filter" }), _jsx(Select, { value: language, onChange: (v) => setLanguage(String(v || "en")), options: LANGS, variant: "filter" })] }), _jsx(TextArea, { rows: 18, width: "100%", value: json, onChange: (e) => setJson(e.target.value), placeholder: "Paste puzzle JSON (without id/date/language)" }), _jsx(Button, { mt: "lg", variant: "primary", onClick: upload, disabled: busy, children: busy ? "Saving..." : "Create Puzzle" })] }));
};
export default ImportPage;
