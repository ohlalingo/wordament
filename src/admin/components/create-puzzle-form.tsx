import React, { useEffect, useState } from "react"
import { Box, Button, Input, TextArea, Select, Label, DatePicker } from "@adminjs/design-system"

const TYPES = [
  { value: "crossword", label: "Crossword" },
  { value: "wordsearch", label: "Wordsearch" },
  { value: "unjumble", label: "Unjumble" },
]

const LANGS = [
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
]

type Props = {
  record?: any
  action?: any
}

const CreatePuzzleForm: React.FC<Props> = ({ record, action }) => {
  const isEdit = action?.name === "edit" && record?.id

  const [id, setId] = useState("")
  const [dateIso, setDateIso] = useState<string | null>(null)
  const [type, setType] = useState("crossword")
  const [language, setLanguage] = useState("en")
  const [json, setJson] = useState("")
  const [busy, setBusy] = useState(false)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i)
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
  ]

  // When editing, hydrate form from the record; if AdminJS didn't embed content/date/type,
  // fetch the full record detail to prefill the fields.
  useEffect(() => {
    const load = async () => {
      const p = record?.params
      if (!p) return
      const recId =
        (record as any)?.id ||
        (record as any)?.params?.id ||
        (() => {
          const m = window.location.pathname.match(/records\/([^/]+)\/edit/i)
          return m ? m[1] : null
        })()
      if (!recId) return

      const adminHeader = (window as any)?.ADMIN_USER_ID || "1"
      const adminToken = (window as any)?.ADMIN_TOKEN || localStorage.getItem("ADMIN_TOKEN") || ""
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (adminHeader) headers["x-user-id"] = String(adminHeader)
      if (adminToken) headers["x-admin-token"] = adminToken

      // Prefer custom endpoint that returns puzzle_date/type_name/content in one go
      const base = window.location.origin
      let detail: any | null = null
      try {
        const res = await fetch(`${base}/admin/api/puzzle/${recId}`, {
          method: "GET",
          headers,
          credentials: "include",
        })
        if (res.ok) detail = await res.json()
      } catch (err) {
        console.warn("Could not fetch via /admin/api/puzzle/:id", err)
      }

      // Fallback to AdminJS record detail if needed
      if (!detail) {
        try {
          const res = await fetch(`${base}/admin/api/resources/PuzzleContent/records/${recId}`, {
            method: "GET",
            headers,
            credentials: "include",
          })
          if (res.ok) {
            const body = await res.json()
            detail = body?.record?.params || null
          }
        } catch (err) {
          console.warn("Could not fetch via AdminJS resource detail", err)
        }
      }

      const contentVal = detail?.content ?? p.content
      const langVal = (detail?.language as string) || (p.language as string) || "en"
      const typeVal = (detail?.type_name as string) || (p.type_name as string) || (p.type as string)
      const dateVal = (detail?.puzzle_date as string) || (p.puzzle_date as string) || (p.date as string)
      const extId = (detail?.external_id as string) || (p.externalId as string) || (p.id as string) || ""

      setId(extId)
      setLanguage(langVal.toLowerCase())
      setType(typeVal || "crossword")
      if (dateVal) setDateIso(dateVal)

      if (contentVal !== undefined && contentVal !== null) {
        if (typeof contentVal === "string") setJson(contentVal)
        else setJson(JSON.stringify(contentVal, null, 2))
      }
    }

    load()
  }, [record])

  const upload = async () => {
    if (!dateIso && !isEdit) return alert("Date is required.")
    if (!id.trim()) return alert("ID is required.")
    if (!json.trim()) return alert("Paste puzzle JSON.")

    let parsed: any
    try {
      parsed = JSON.parse(json)
    } catch (err) {
      return alert("JSON is invalid.")
    }

    const adminHeader = (window as any)?.ADMIN_USER_ID || "1"
    const adminToken = (window as any)?.ADMIN_TOKEN || localStorage.getItem("ADMIN_TOKEN") || ""
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (adminHeader) headers["x-user-id"] = String(adminHeader)
    if (adminToken) headers["x-admin-token"] = adminToken

    setBusy(true)
    try {
      if (isEdit) {
        const recId =
          (record as any)?.id ||
          (record as any)?.params?.id ||
          (() => {
            const m = window.location.pathname.match(/records\/([^/]+)\/edit/i)
            return m ? m[1] : null
          })()
        if (!recId) throw new Error("Missing record id for edit")
        const base = window.location.origin
        const res = await fetch(`${base}/admin/api/puzzle/${recId}`, {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({
            content: parsed,
            puzzleDate: dateIso,
            type,
            language,
            externalId: id,
          }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error || "Update failed")
        alert("Updated puzzle content")
      } else {
        const item = { id, date: dateIso, type, language, content: parsed }
        const base = window.location.origin
        const res = await fetch(`${base}/api/import-puzzle`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify([item]),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error || "Import failed")
        alert(`Imported ${body.imported ?? 0} puzzle(s)`)
        setId("")
        setDateIso(null)
        setJson("")
      }
    } catch (err: any) {
      alert(err.message || "Save failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box variant="white" p="xl" style={{ maxWidth: 900 }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit Puzzle Content" : "Create Puzzle"}</h2>
      <Box display="grid" gridTemplateColumns="1fr 1fr" gridGap="16px" mb="lg">
        <Box display="flex" flexDirection="column" gap="4px">
          <Label>Puzzle ID</Label>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Unique per language"
            width="100%"
          />
        </Box>
        <Box display="flex" flexDirection="column" gap="4px">
          <Label>Puzzle Date</Label>
          <DatePicker
            value={dateIso || undefined}
            onChange={(val) => setDateIso(val)}
            propertyType="date"
            placeholderText="YYYY-MM-DD"
            dateFormat="yyyy-MM-dd"
            shouldCloseOnSelect
            popperPlacement="bottom-start"
            renderCustomHeader={({
              date,
              changeYear,
              changeMonth,
              decreaseMonth,
              increaseMonth,
            }) => (
              <Box display="flex" alignItems="center" justifyContent="space-between" px="md" py="sm">
                <button type="button" onClick={decreaseMonth} style={{ background: "none", border: "none" }}>
                  ‹
                </button>
                <Box display="flex" gap="8px">
                  <Select
                    value={{ value: months[date.getMonth()], label: months[date.getMonth()] }}
                    onChange={(opt) => changeMonth(months.findIndex((m) => m === (opt as any)?.value))}
                    options={months.map((m) => ({ value: m, label: m }))}
                    variant="filter"
                  />
                  <Select
                    value={{ value: date.getFullYear(), label: String(date.getFullYear()) }}
                    onChange={(opt) => changeYear(Number((opt as any)?.value))}
                    options={years.map((y) => ({ value: y, label: String(y) }))}
                    variant="filter"
                  />
                </Box>
                <button type="button" onClick={increaseMonth} style={{ background: "none", border: "none" }}>
                  ›
                </button>
              </Box>
            )}
          />
        </Box>
        <Box display="flex" flexDirection="column" gap="4px">
          <Label>Puzzle Type</Label>
          <Select
            value={TYPES.find((o) => o.value === type)}
            onChange={(opt) => setType((opt as any)?.value || "crossword")}
            options={TYPES}
            variant="filter"
          />
        </Box>
        <Box display="flex" flexDirection="column" gap="4px">
          <Label>Language</Label>
          <Select
            value={LANGS.find((o) => o.value === language)}
            onChange={(opt) => setLanguage((opt as any)?.value || "en")}
            options={LANGS}
            variant="filter"
          />
        </Box>
      </Box>

      <TextArea
        label="Puzzle JSON"
        rows={18}
        width="100%"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder="Paste puzzle JSON (without id/date/language)"
      />

      <Button mt="lg" variant="primary" onClick={upload} disabled={busy}>
        {busy ? "Saving..." : "Save Puzzle"}
      </Button>
    </Box>
  )
}

export default CreatePuzzleForm
