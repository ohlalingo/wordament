import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Button, Input, TextArea, Select, Label, DatePicker } from "@adminjs/design-system";
const TYPES = [
    { value: "crossword", label: "Crossword" },
    { value: "wordsearch", label: "Wordsearch" },
    { value: "unjumble", label: "Unjumble" },
];
const LANGS = [
    { value: "en", label: "English" },
    { value: "ja", label: "Japanese" },
];
const CreatePuzzleForm = ({ record, action }) => {
    const isEdit = action?.name === "edit" && record?.id;
    const [id, setId] = useState("");
    const [dateIso, setDateIso] = useState(null);
    const [type, setType] = useState("crossword");
    const [language, setLanguage] = useState("en");
    const [slot, setSlot] = useState(1);
    const [json, setJson] = useState("");
    const [busy, setBusy] = useState(false);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);
    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    // When editing, hydrate form from the record; if AdminJS didn't embed content/date/type,
    // fetch the full record detail to prefill the fields.
    useEffect(() => {
        const load = async () => {
            const p = record?.params;
            if (!p)
                return;
            const recId = record?.id ||
                record?.params?.id ||
                (() => {
                    const m = window.location.pathname.match(/records\/([^/]+)\/edit/i);
                    return m ? m[1] : null;
                })();
            if (!recId)
                return;
            const adminHeader = window?.ADMIN_USER_ID || "1";
            const adminToken = window?.ADMIN_TOKEN || localStorage.getItem("ADMIN_TOKEN") || "";
            const headers = { "Content-Type": "application/json" };
            if (adminHeader)
                headers["x-user-id"] = String(adminHeader);
            if (adminToken)
                headers["x-admin-token"] = adminToken;
            // Prefer custom endpoint that returns puzzle_date/type_name/content in one go
            const base = window.location.origin;
            let detail = null;
            try {
                const res = await fetch(`${base}/admin/api/puzzle/${recId}`, {
                    method: "GET",
                    headers,
                    credentials: "include",
                });
                if (res.ok)
                    detail = await res.json();
            }
            catch (err) {
                console.warn("Could not fetch via /admin/api/puzzle/:id", err);
            }
            // Fallback to AdminJS record detail if needed
            if (!detail) {
                try {
                    const res = await fetch(`${base}/admin/api/resources/PuzzleContent/records/${recId}`, {
                        method: "GET",
                        headers,
                        credentials: "include",
                    });
                    if (res.ok) {
                        const body = await res.json();
                        detail = body?.record?.params || null;
                    }
                }
                catch (err) {
                    console.warn("Could not fetch via AdminJS resource detail", err);
                }
            }
            const contentVal = detail?.content ?? p.content;
            const langVal = detail?.language || p.language || "en";
            const typeVal = detail?.type_name || p.type_name || p.type;
            const dateVal = detail?.puzzle_date || p.puzzle_date || p.date;
            const extId = detail?.external_id || p.externalId || p.id || "";
            const slotVal = detail?.slot ?? p.slot ?? 1;
            setId(extId);
            setLanguage(langVal.toLowerCase());
            setType(typeVal || "crossword");
            if (dateVal)
                setDateIso(dateVal.split("T")[0]);
            setSlot(Number(slotVal) || 1);
            if (contentVal !== undefined && contentVal !== null) {
                if (typeof contentVal === "string")
                    setJson(contentVal);
                else
                    setJson(JSON.stringify(contentVal, null, 2));
            }
        };
        load();
    }, [record]);
    const upload = async () => {
        if (!dateIso && !isEdit)
            return alert("Date is required.");
        if (!id.trim())
            return alert("ID is required.");
        if (!json.trim())
            return alert("Paste puzzle JSON.");
        if (!dateIso)
            return alert("Pick a puzzle date.");
        let parsed;
        try {
            parsed = JSON.parse(json);
        }
        catch (err) {
            return alert("JSON is invalid.");
        }
        const adminHeader = window?.ADMIN_USER_ID || "1";
        const adminToken = window?.ADMIN_TOKEN || localStorage.getItem("ADMIN_TOKEN") || "";
        const headers = { "Content-Type": "application/json" };
        if (adminHeader)
            headers["x-user-id"] = String(adminHeader);
        if (adminToken)
            headers["x-admin-token"] = adminToken;
        setBusy(true);
        try {
            const dateStr = typeof dateIso === "string"
                ? dateIso
                : dateIso
                    ? dateIso.toISOString().slice(0, 10)
                    : null;
            if (isEdit) {
                const recId = record?.id ||
                    record?.params?.id ||
                    (() => {
                        const m = window.location.pathname.match(/records\/([^/]+)\/edit/i);
                        return m ? m[1] : null;
                    })();
                if (!recId)
                    throw new Error("Missing record id for edit");
                const base = window.location.origin;
                const res = await fetch(`${base}/admin/api/puzzle/${recId}`, {
                    method: "PATCH",
                    headers,
                    credentials: "include",
                    body: JSON.stringify({
                        content: parsed,
                        puzzleDate: dateStr,
                        type,
                        language,
                        slot,
                        externalId: id,
                    }),
                });
                const body = await res.json();
                if (!res.ok)
                    throw new Error(body?.error || "Update failed");
                alert("Updated puzzle content");
            }
            else {
                const item = { id, date: dateStr, type, language, slot, content: parsed };
                const base = window.location.origin;
                const res = await fetch(`${base}/api/import-puzzle`, {
                    method: "POST",
                    headers,
                    credentials: "include",
                    body: JSON.stringify([item]),
                });
                const body = await res.json();
                if (!res.ok)
                    throw new Error(body?.error || "Import failed");
                alert(`Imported ${body.imported ?? 0} puzzle(s)`);
                setId("");
                setDateIso(null);
                setJson("");
            }
        }
        catch (err) {
            alert(err.message || "Save failed");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs(Box, { variant: "white", p: "xl", style: { maxWidth: 900 }, children: [_jsx("h2", { style: { marginTop: 0 }, children: isEdit ? "Edit Puzzle Content" : "Create Puzzle" }), _jsxs(Box, { display: "grid", gridTemplateColumns: "1fr 1fr", gridGap: "16px", mb: "lg", children: [_jsxs(Box, { display: "flex", flexDirection: "column", gap: "4px", children: [_jsx(Label, { children: "Puzzle ID" }), _jsx(Input, { value: id, onChange: (e) => setId(e.target.value), placeholder: "Unique per language", width: "100%" })] }), _jsxs(Box, { display: "flex", flexDirection: "column", gap: "4px", children: [_jsx(Label, { children: "Puzzle Date" }), _jsx(DatePicker, { value: dateIso ? new Date(dateIso + "T00:00:00") : undefined, onChange: (val) => {
                                    const v = val;
                                    if (v instanceof Date)
                                        setDateIso(v.toISOString().slice(0, 10));
                                    else if (typeof v === "string")
                                        setDateIso(v.split("T")[0]);
                                    else
                                        setDateIso(null);
                                }, propertyType: "date", placeholderText: "YYYY-MM-DD", dateFormat: "yyyy-MM-dd", shouldCloseOnSelect: true, popperPlacement: "bottom-start", renderCustomHeader: ({ date, changeYear, changeMonth, decreaseMonth, increaseMonth, }) => (_jsxs(Box, { display: "flex", alignItems: "center", justifyContent: "space-between", px: "md", py: "sm", children: [_jsx("button", { type: "button", onClick: decreaseMonth, style: { background: "none", border: "none" }, children: "\u2039" }), _jsxs(Box, { display: "flex", gap: "8px", children: [_jsx(Select, { value: { value: months[date.getMonth()], label: months[date.getMonth()] }, onChange: (opt) => changeMonth(months.findIndex((m) => m === opt?.value)), options: months.map((m) => ({ value: m, label: m })), variant: "filter" }), _jsx(Select, { value: { value: date.getFullYear(), label: String(date.getFullYear()) }, onChange: (opt) => changeYear(Number(opt?.value)), options: years.map((y) => ({ value: y, label: String(y) })), variant: "filter" })] }), _jsx("button", { type: "button", onClick: increaseMonth, style: { background: "none", border: "none" }, children: "\u203A" })] })) })] }), _jsxs(Box, { display: "flex", flexDirection: "column", gap: "4px", children: [_jsx(Label, { children: "Puzzle Type" }), _jsx(Select, { value: TYPES.find((o) => o.value === type), onChange: (opt) => setType(opt?.value || "crossword"), options: TYPES, variant: "filter" })] }), _jsxs(Box, { display: "flex", flexDirection: "column", gap: "4px", children: [_jsx(Label, { children: "Language" }), _jsx(Select, { value: LANGS.find((o) => o.value === language), onChange: (opt) => setLanguage(opt?.value || "en"), options: LANGS, variant: "filter" })] }), _jsxs(Box, { display: "flex", flexDirection: "column", gap: "4px", children: [_jsx(Label, { children: "Slot" }), _jsx(Input, { type: "number", value: slot, onChange: (e) => setSlot(Math.max(1, Number(e.target.value) || 1)), min: 1, width: "100%" })] })] }), _jsx(TextArea, { label: "Puzzle JSON", rows: 18, width: "100%", value: json, onChange: (e) => setJson(e.target.value), placeholder: "Paste puzzle JSON (without id/date/language)" }), _jsx(Button, { mt: "lg", variant: "primary", onClick: upload, disabled: busy, children: busy ? "Saving..." : "Save Puzzle" })] }));
};
export default CreatePuzzleForm;
