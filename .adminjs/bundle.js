(function (React, designSystem, adminjs, styledComponents) {
  'use strict';

  function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

  var React__default = /*#__PURE__*/_interopDefault(React);

  const TYPES = [{
    value: "crossword",
    label: "Crossword"
  }, {
    value: "wordsearch",
    label: "Wordsearch"
  }, {
    value: "unjumble",
    label: "Unjumble"
  }];
  const LANGS = [{
    value: "en",
    label: "English"
  }, {
    value: "ja",
    label: "Japanese"
  }];
  const CreatePuzzleForm = ({
    record,
    action
  }) => {
    const isEdit = action?.name === "edit" && record?.id;
    const [id, setId] = React.useState("");
    const [dateIso, setDateIso] = React.useState(null);
    const [type, setType] = React.useState("crossword");
    const [language, setLanguage] = React.useState("en");
    const [slot, setSlot] = React.useState(1);
    const [json, setJson] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const currentYear = new Date().getFullYear();
    const years = Array.from({
      length: 10
    }, (_, i) => currentYear - 3 + i);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // When editing, hydrate form from the record; if AdminJS didn't embed content/date/type,
    // fetch the full record detail to prefill the fields.
    React.useEffect(() => {
      const load = async () => {
        const p = record?.params;
        if (!p) return;
        const recId = record?.id || record?.params?.id || (() => {
          const m = window.location.pathname.match(/records\/([^/]+)\/edit/i);
          return m ? m[1] : null;
        })();
        if (!recId) return;
        const adminHeader = window?.ADMIN_USER_ID || "1";
        const adminToken = window?.ADMIN_TOKEN || localStorage.getItem("ADMIN_TOKEN") || "";
        const headers = {
          "Content-Type": "application/json"
        };
        headers["x-user-id"] = String(adminHeader);
        if (adminToken) headers["x-admin-token"] = adminToken;

        // Prefer custom endpoint that returns puzzle_date/type_name/content in one go
        const base = window.location.origin;
        let detail = null;
        try {
          const res = await fetch(`${base}/admin/api/puzzle/${recId}`, {
            method: "GET",
            headers,
            credentials: "include"
          });
          if (res.ok) detail = await res.json();
        } catch (err) {
          console.warn("Could not fetch via /admin/api/puzzle/:id", err);
        }

        // Fallback to AdminJS record detail if needed
        if (!detail) {
          try {
            const res = await fetch(`${base}/admin/api/resources/PuzzleContent/records/${recId}`, {
              method: "GET",
              headers,
              credentials: "include"
            });
            if (res.ok) {
              const body = await res.json();
              detail = body?.record?.params || null;
            }
          } catch (err) {
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
        if (dateVal) setDateIso(dateVal);
        setSlot(Number(slotVal) || 1);
        if (contentVal !== undefined && contentVal !== null) {
          if (typeof contentVal === "string") setJson(contentVal);else setJson(JSON.stringify(contentVal, null, 2));
        }
      };
      load();
    }, [record]);
    const upload = async () => {
      if (!dateIso && !isEdit) return alert("Date is required.");
      if (!id.trim()) return alert("ID is required.");
      if (!json.trim()) return alert("Paste puzzle JSON.");
      if (!dateIso) return alert("Pick a puzzle date.");
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (err) {
        return alert("JSON is invalid.");
      }
      const adminHeader = window?.ADMIN_USER_ID || "1";
      const adminToken = window?.ADMIN_TOKEN || localStorage.getItem("ADMIN_TOKEN") || "";
      const headers = {
        "Content-Type": "application/json"
      };
      headers["x-user-id"] = String(adminHeader);
      if (adminToken) headers["x-admin-token"] = adminToken;
      setBusy(true);
      try {
        const dateStr = typeof dateIso === "string" ? dateIso : dateIso ? dateIso.toLocaleDateString("en-CA") : null;
        if (isEdit) {
          const recId = record?.id || record?.params?.id || (() => {
            const m = window.location.pathname.match(/records\/([^/]+)\/edit/i);
            return m ? m[1] : null;
          })();
          if (!recId) throw new Error("Missing record id for edit");
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
              externalId: id
            })
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body?.error || "Update failed");
          alert("Updated puzzle content");
        } else {
          const item = {
            id,
            date: dateStr,
            type,
            language,
            slot,
            content: parsed
          };
          const base = window.location.origin;
          const res = await fetch(`${base}/api/import-puzzle`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify([item])
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body?.error || "Import failed");
          alert(`Imported ${body.imported ?? 0} puzzle(s)`);
          setId("");
          setDateIso(null);
          setJson("");
        }
      } catch (err) {
        alert(err.message || "Save failed");
      } finally {
        setBusy(false);
      }
    };
    return /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      variant: "white",
      p: "xl",
      style: {
        maxWidth: 900
      }
    }, /*#__PURE__*/React__default.default.createElement("h2", {
      style: {
        marginTop: 0
      }
    }, isEdit ? "Edit Puzzle Content" : "Create Puzzle"), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridGap: "16px",
      mb: "lg"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Puzzle ID"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      value: id,
      onChange: e => setId(e.target.value),
      placeholder: "Unique per language",
      width: "100%"
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Puzzle Date"), /*#__PURE__*/React__default.default.createElement(designSystem.DatePicker, {
      value: dateIso || undefined,
      onChange: val => setDateIso(val),
      propertyType: "date",
      placeholderText: "YYYY-MM-DD",
      dateFormat: "yyyy-MM-dd",
      shouldCloseOnSelect: true,
      popperPlacement: "bottom-start",
      renderCustomHeader: ({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth
      }) => /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: "md",
        py: "sm"
      }, /*#__PURE__*/React__default.default.createElement("button", {
        type: "button",
        onClick: decreaseMonth,
        style: {
          background: "none",
          border: "none"
        }
      }, "\u2039"), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
        display: "flex",
        gap: "8px"
      }, /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
        value: {
          value: months[date.getMonth()],
          label: months[date.getMonth()]
        },
        onChange: opt => changeMonth(months.findIndex(m => m === opt?.value)),
        options: months.map(m => ({
          value: m,
          label: m
        })),
        variant: "filter"
      }), /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
        value: {
          value: date.getFullYear(),
          label: String(date.getFullYear())
        },
        onChange: opt => changeYear(Number(opt?.value)),
        options: years.map(y => ({
          value: y,
          label: String(y)
        })),
        variant: "filter"
      })), /*#__PURE__*/React__default.default.createElement("button", {
        type: "button",
        onClick: increaseMonth,
        style: {
          background: "none",
          border: "none"
        }
      }, "\u203A"))
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Puzzle Type"), /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
      value: TYPES.find(o => o.value === type),
      onChange: opt => setType(opt?.value || "crossword"),
      options: TYPES,
      variant: "filter"
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Language"), /*#__PURE__*/React__default.default.createElement(designSystem.Select, {
      value: LANGS.find(o => o.value === language),
      onChange: opt => setLanguage(opt?.value || "en"),
      options: LANGS,
      variant: "filter"
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Label, null, "Slot"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      type: "number",
      value: slot,
      onChange: e => setSlot(Math.max(1, Number(e.target.value) || 1)),
      min: 1,
      width: "100%"
    }))), /*#__PURE__*/React__default.default.createElement(designSystem.TextArea, {
      label: "Puzzle JSON",
      rows: 18,
      width: "100%",
      value: json,
      onChange: e => setJson(e.target.value),
      placeholder: "Paste puzzle JSON (without id/date/language)"
    }), /*#__PURE__*/React__default.default.createElement(designSystem.Button, {
      mt: "lg",
      variant: "primary",
      onClick: upload,
      disabled: busy
    }, busy ? "Saving..." : "Save Puzzle"));
  };

  const api = new adminjs.ApiClient();
  function Dashboard() {
    const [data, setData] = React.useState(null);
    const addNotice = adminjs.useNotice();
    React.useEffect(() => {
      api.getDashboard().then(res => setData(res.data)).catch(() => addNotice({
        message: "Failed to load stats",
        type: "error"
      }));
    }, []);
    const statCard = (label, value) => /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
        minWidth: 220,
        minHeight: 96,
        background: "#fff",
        boxShadow: "0 8px 18px rgba(17,24,39,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        marginBottom: 6
      }
    }, label), /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 32,
        fontWeight: 800,
        color: "#d60000",
        lineHeight: 1.1
      }
    }, value ?? "—"));
    const last = data?.lastAttempt;
    return /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        padding: 24
      }
    }, /*#__PURE__*/React__default.default.createElement("h1", {
      style: {
        fontSize: 28,
        fontWeight: 800,
        marginBottom: 12,
        color: "#111827"
      }
    }, "Welcome to CyberWordament Warehouse"), /*#__PURE__*/React__default.default.createElement("p", {
      style: {
        color: "#6b7280",
        marginBottom: 24
      }
    }, "Live ops snapshot for puzzles and players."), /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        marginBottom: 24
      }
    }, statCard("Attempts today", data?.counts?.attempts_today), statCard("Attempts this week", data?.counts?.attempts_week), statCard("Attempts all time", data?.counts?.attempts_all), statCard("Active users", data?.users?.active_users), statCard("Total users", data?.users?.total_users)), /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
        minWidth: 220,
        minHeight: 96,
        background: "#fff",
        boxShadow: "0 8px 18px rgba(17,24,39,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        marginBottom: 6
      }
    }, "Last attempt"), last ? /*#__PURE__*/React__default.default.createElement(React__default.default.Fragment, null, /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 32,
        fontWeight: 800,
        color: "#d60000",
        lineHeight: 1.1
      }
    }, last.name || "Unknown"), /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 8
      }
    }, last.region ? `Region: ${last.region}` : "Region: —"), /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 4
      }
    }, last.created_at ? `When: ${new Date(last.created_at).toLocaleString()}` : "When: —")) : /*#__PURE__*/React__default.default.createElement("div", {
      style: {
        fontSize: 13,
        color: "#6b7280"
      }
    }, "No attempts yet.")));
  }

  const Wrapper = styledComponents.styled(designSystem.Box)`
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 100%;
`;
  const StyledLogo = styledComponents.styled.img`
  max-width: 260px;
  margin: 0 auto;
  display: block;
`;
  const Header = styledComponents.styled.div`
  text-align: center;
  font-size: 1.5rem; /* ~text-2xl */
  font-weight: 800; /* font-extrabold */
  color: #d60000;
  margin-bottom: ${({
  theme
}) => theme.space.md};
`;
  const LetterRow = styledComponents.styled.div`
  display: flex;
  justify-content: center;
  gap: 2px;
  margin-bottom: ${({
  theme
}) => theme.space.xl};
`;
  const LetterBox = styledComponents.styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 18px;
  border: 1px solid #d60000;
  border-radius: 3px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  color: #d60000;
`;
  const RedButton = styledComponents.styled(designSystem.Button)`
  background-color: #d60000 !important;
  border-color: #d60000 !important;
  &:hover {
    background-color: #b00000 !important;
    border-color: #b00000 !important;
  }
`;
  const RequiredLabel = styledComponents.styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  .asterisk {
    color: #d60000;
    margin-right: 4px;
  }
`;

  // Custom lightweight login without the left illustration or footer
  const CustomLogin = () => {
    const props = window.__APP_STATE__;
    const {
      action,
      errorMessage: message,
      branding
    } = props;
    return /*#__PURE__*/React__default.default.createElement(Wrapper, {
      flex: true,
      variant: "grey",
      className: "login__Wrapper"
    }, /*#__PURE__*/React__default.default.createElement(designSystem.Box, {
      as: "form",
      action: action,
      method: "POST",
      bg: "white",
      p: "x4",
      boxShadow: "login",
      width: ["100%", "480px"]
    }, /*#__PURE__*/React__default.default.createElement(Header, null, "CyberWordament WareHouse"), /*#__PURE__*/React__default.default.createElement(LetterRow, null, "CYBERWORDAMENT".split("").map((letter, idx) => /*#__PURE__*/React__default.default.createElement(LetterBox, {
      key: `${letter}-${idx}`
    }, letter))), /*#__PURE__*/React__default.default.createElement(designSystem.H5, {
      marginBottom: "xxl",
      textAlign: "center"
    }, branding?.logo ? /*#__PURE__*/React__default.default.createElement(StyledLogo, {
      src: branding.logo,
      alt: branding.companyName
    }) : branding?.companyName), message && /*#__PURE__*/React__default.default.createElement(designSystem.MessageBox, {
      my: "lg",
      message: message,
      variant: "danger"
    }), /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, null, /*#__PURE__*/React__default.default.createElement(RequiredLabel, null, /*#__PURE__*/React__default.default.createElement("span", {
      className: "asterisk"
    }, "*"), "Email"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      name: "email",
      placeholder: "Email"
    })), /*#__PURE__*/React__default.default.createElement(designSystem.FormGroup, null, /*#__PURE__*/React__default.default.createElement(RequiredLabel, null, /*#__PURE__*/React__default.default.createElement("span", {
      className: "asterisk"
    }, "*"), "Password"), /*#__PURE__*/React__default.default.createElement(designSystem.Input, {
      type: "password",
      name: "password",
      placeholder: "Password",
      autoComplete: "new-password"
    })), /*#__PURE__*/React__default.default.createElement(designSystem.Text, {
      mt: "xl",
      textAlign: "center"
    }, /*#__PURE__*/React__default.default.createElement(RedButton, {
      variant: "contained"
    }, "Login"))));
  };

  AdminJS.UserComponents = {};
  AdminJS.UserComponents.CreatePuzzleForm = CreatePuzzleForm;
  AdminJS.UserComponents.Dashboard = Dashboard;
  AdminJS.UserComponents.Login = CustomLogin;

})(React, AdminJSDesignSystem, AdminJS, styled);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9zcmMvYWRtaW4vY29tcG9uZW50cy9jcmVhdGUtcHV6emxlLWZvcm0udHN4IiwiLi4vc3JjL2FkbWluL2NvbXBvbmVudHMvZGFzaGJvYXJkLnRzeCIsIi4uL3NyYy9hZG1pbi9jb21wb25lbnRzL2N1c3RvbS1sb2dpbi50c3giLCJlbnRyeS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiXG5pbXBvcnQgeyBCb3gsIEJ1dHRvbiwgSW5wdXQsIFRleHRBcmVhLCBTZWxlY3QsIExhYmVsLCBEYXRlUGlja2VyIH0gZnJvbSBcIkBhZG1pbmpzL2Rlc2lnbi1zeXN0ZW1cIlxuXG5jb25zdCBUWVBFUyA9IFtcbiAgeyB2YWx1ZTogXCJjcm9zc3dvcmRcIiwgbGFiZWw6IFwiQ3Jvc3N3b3JkXCIgfSxcbiAgeyB2YWx1ZTogXCJ3b3Jkc2VhcmNoXCIsIGxhYmVsOiBcIldvcmRzZWFyY2hcIiB9LFxuICB7IHZhbHVlOiBcInVuanVtYmxlXCIsIGxhYmVsOiBcIlVuanVtYmxlXCIgfSxcbl1cblxuY29uc3QgTEFOR1MgPSBbXG4gIHsgdmFsdWU6IFwiZW5cIiwgbGFiZWw6IFwiRW5nbGlzaFwiIH0sXG4gIHsgdmFsdWU6IFwiamFcIiwgbGFiZWw6IFwiSmFwYW5lc2VcIiB9LFxuXVxuXG50eXBlIFByb3BzID0ge1xuICByZWNvcmQ/OiBhbnlcbiAgYWN0aW9uPzogYW55XG59XG5cbmNvbnN0IENyZWF0ZVB1enpsZUZvcm06IFJlYWN0LkZDPFByb3BzPiA9ICh7IHJlY29yZCwgYWN0aW9uIH0pID0+IHtcbiAgY29uc3QgaXNFZGl0ID0gYWN0aW9uPy5uYW1lID09PSBcImVkaXRcIiAmJiByZWNvcmQ/LmlkXG5cbiAgY29uc3QgW2lkLCBzZXRJZF0gPSB1c2VTdGF0ZShcIlwiKVxuICBjb25zdCBbZGF0ZUlzbywgc2V0RGF0ZUlzb10gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKVxuICBjb25zdCBbdHlwZSwgc2V0VHlwZV0gPSB1c2VTdGF0ZShcImNyb3Nzd29yZFwiKVxuICBjb25zdCBbbGFuZ3VhZ2UsIHNldExhbmd1YWdlXSA9IHVzZVN0YXRlKFwiZW5cIilcbiAgY29uc3QgW3Nsb3QsIHNldFNsb3RdID0gdXNlU3RhdGU8bnVtYmVyPigxKVxuICBjb25zdCBbanNvbiwgc2V0SnNvbl0gPSB1c2VTdGF0ZShcIlwiKVxuICBjb25zdCBbYnVzeSwgc2V0QnVzeV0gPSB1c2VTdGF0ZShmYWxzZSlcbiAgY29uc3QgY3VycmVudFllYXIgPSBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKClcbiAgY29uc3QgeWVhcnMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiAxMCB9LCAoXywgaSkgPT4gY3VycmVudFllYXIgLSAzICsgaSlcbiAgY29uc3QgbW9udGhzID0gW1xuICAgIFwiSmFudWFyeVwiLFxuICAgIFwiRmVicnVhcnlcIixcbiAgICBcIk1hcmNoXCIsXG4gICAgXCJBcHJpbFwiLFxuICAgIFwiTWF5XCIsXG4gICAgXCJKdW5lXCIsXG4gICAgXCJKdWx5XCIsXG4gICAgXCJBdWd1c3RcIixcbiAgICBcIlNlcHRlbWJlclwiLFxuICAgIFwiT2N0b2JlclwiLFxuICAgIFwiTm92ZW1iZXJcIixcbiAgICBcIkRlY2VtYmVyXCIsXG4gIF1cblxuICAvLyBXaGVuIGVkaXRpbmcsIGh5ZHJhdGUgZm9ybSBmcm9tIHRoZSByZWNvcmQ7IGlmIEFkbWluSlMgZGlkbid0IGVtYmVkIGNvbnRlbnQvZGF0ZS90eXBlLFxuICAvLyBmZXRjaCB0aGUgZnVsbCByZWNvcmQgZGV0YWlsIHRvIHByZWZpbGwgdGhlIGZpZWxkcy5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBsb2FkID0gYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcCA9IHJlY29yZD8ucGFyYW1zXG4gICAgICBpZiAoIXApIHJldHVyblxuICAgICAgY29uc3QgcmVjSWQgPVxuICAgICAgICAocmVjb3JkIGFzIGFueSk/LmlkIHx8XG4gICAgICAgIChyZWNvcmQgYXMgYW55KT8ucGFyYW1zPy5pZCB8fFxuICAgICAgICAoKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG0gPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL3JlY29yZHNcXC8oW14vXSspXFwvZWRpdC9pKVxuICAgICAgICAgIHJldHVybiBtID8gbVsxXSA6IG51bGxcbiAgICAgICAgfSkoKVxuICAgICAgaWYgKCFyZWNJZCkgcmV0dXJuXG5cbiAgICAgIGNvbnN0IGFkbWluSGVhZGVyID0gKHdpbmRvdyBhcyBhbnkpPy5BRE1JTl9VU0VSX0lEIHx8IFwiMVwiXG4gICAgICBjb25zdCBhZG1pblRva2VuID0gKHdpbmRvdyBhcyBhbnkpPy5BRE1JTl9UT0tFTiB8fCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIkFETUlOX1RPS0VOXCIpIHx8IFwiXCJcbiAgICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH1cbiAgICAgIGlmIChhZG1pbkhlYWRlcikgaGVhZGVyc1tcIngtdXNlci1pZFwiXSA9IFN0cmluZyhhZG1pbkhlYWRlcilcbiAgICAgIGlmIChhZG1pblRva2VuKSBoZWFkZXJzW1wieC1hZG1pbi10b2tlblwiXSA9IGFkbWluVG9rZW5cblxuICAgICAgLy8gUHJlZmVyIGN1c3RvbSBlbmRwb2ludCB0aGF0IHJldHVybnMgcHV6emxlX2RhdGUvdHlwZV9uYW1lL2NvbnRlbnQgaW4gb25lIGdvXG4gICAgICBjb25zdCBiYXNlID0gd2luZG93LmxvY2F0aW9uLm9yaWdpblxuICAgICAgbGV0IGRldGFpbDogYW55IHwgbnVsbCA9IG51bGxcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGAke2Jhc2V9L2FkbWluL2FwaS9wdXp6bGUvJHtyZWNJZH1gLCB7XG4gICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxuICAgICAgICB9KVxuICAgICAgICBpZiAocmVzLm9rKSBkZXRhaWwgPSBhd2FpdCByZXMuanNvbigpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiQ291bGQgbm90IGZldGNoIHZpYSAvYWRtaW4vYXBpL3B1enpsZS86aWRcIiwgZXJyKVxuICAgICAgfVxuXG4gICAgICAvLyBGYWxsYmFjayB0byBBZG1pbkpTIHJlY29yZCBkZXRhaWwgaWYgbmVlZGVkXG4gICAgICBpZiAoIWRldGFpbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGAke2Jhc2V9L2FkbWluL2FwaS9yZXNvdXJjZXMvUHV6emxlQ29udGVudC9yZWNvcmRzLyR7cmVjSWR9YCwge1xuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcbiAgICAgICAgICB9KVxuICAgICAgICAgIGlmIChyZXMub2spIHtcbiAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXMuanNvbigpXG4gICAgICAgICAgICBkZXRhaWwgPSBib2R5Py5yZWNvcmQ/LnBhcmFtcyB8fCBudWxsXG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJDb3VsZCBub3QgZmV0Y2ggdmlhIEFkbWluSlMgcmVzb3VyY2UgZGV0YWlsXCIsIGVycilcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ZW50VmFsID0gZGV0YWlsPy5jb250ZW50ID8/IHAuY29udGVudFxuICAgICAgY29uc3QgbGFuZ1ZhbCA9IChkZXRhaWw/Lmxhbmd1YWdlIGFzIHN0cmluZykgfHwgKHAubGFuZ3VhZ2UgYXMgc3RyaW5nKSB8fCBcImVuXCJcbiAgICAgIGNvbnN0IHR5cGVWYWwgPSAoZGV0YWlsPy50eXBlX25hbWUgYXMgc3RyaW5nKSB8fCAocC50eXBlX25hbWUgYXMgc3RyaW5nKSB8fCAocC50eXBlIGFzIHN0cmluZylcbiAgICAgIGNvbnN0IGRhdGVWYWwgPSAoZGV0YWlsPy5wdXp6bGVfZGF0ZSBhcyBzdHJpbmcpIHx8IChwLnB1enpsZV9kYXRlIGFzIHN0cmluZykgfHwgKHAuZGF0ZSBhcyBzdHJpbmcpXG4gICAgICBjb25zdCBleHRJZCA9IChkZXRhaWw/LmV4dGVybmFsX2lkIGFzIHN0cmluZykgfHwgKHAuZXh0ZXJuYWxJZCBhcyBzdHJpbmcpIHx8IChwLmlkIGFzIHN0cmluZykgfHwgXCJcIlxuICAgICAgY29uc3Qgc2xvdFZhbCA9IGRldGFpbD8uc2xvdCA/PyBwLnNsb3QgPz8gMVxuXG4gICAgICBzZXRJZChleHRJZClcbiAgICAgIHNldExhbmd1YWdlKGxhbmdWYWwudG9Mb3dlckNhc2UoKSlcbiAgICAgIHNldFR5cGUodHlwZVZhbCB8fCBcImNyb3Nzd29yZFwiKVxuICAgICAgaWYgKGRhdGVWYWwpIHNldERhdGVJc28oZGF0ZVZhbClcbiAgICAgIHNldFNsb3QoTnVtYmVyKHNsb3RWYWwpIHx8IDEpXG5cbiAgICAgIGlmIChjb250ZW50VmFsICE9PSB1bmRlZmluZWQgJiYgY29udGVudFZhbCAhPT0gbnVsbCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbnRlbnRWYWwgPT09IFwic3RyaW5nXCIpIHNldEpzb24oY29udGVudFZhbClcbiAgICAgICAgZWxzZSBzZXRKc29uKEpTT04uc3RyaW5naWZ5KGNvbnRlbnRWYWwsIG51bGwsIDIpKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxvYWQoKVxuICB9LCBbcmVjb3JkXSlcblxuICBjb25zdCB1cGxvYWQgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKCFkYXRlSXNvICYmICFpc0VkaXQpIHJldHVybiBhbGVydChcIkRhdGUgaXMgcmVxdWlyZWQuXCIpXG4gICAgaWYgKCFpZC50cmltKCkpIHJldHVybiBhbGVydChcIklEIGlzIHJlcXVpcmVkLlwiKVxuICAgIGlmICghanNvbi50cmltKCkpIHJldHVybiBhbGVydChcIlBhc3RlIHB1enpsZSBKU09OLlwiKVxuICAgIGlmICghZGF0ZUlzbykgcmV0dXJuIGFsZXJ0KFwiUGljayBhIHB1enpsZSBkYXRlLlwiKVxuXG4gICAgbGV0IHBhcnNlZDogYW55XG4gICAgdHJ5IHtcbiAgICAgIHBhcnNlZCA9IEpTT04ucGFyc2UoanNvbilcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHJldHVybiBhbGVydChcIkpTT04gaXMgaW52YWxpZC5cIilcbiAgICB9XG5cbiAgICBjb25zdCBhZG1pbkhlYWRlciA9ICh3aW5kb3cgYXMgYW55KT8uQURNSU5fVVNFUl9JRCB8fCBcIjFcIlxuICAgIGNvbnN0IGFkbWluVG9rZW4gPSAod2luZG93IGFzIGFueSk/LkFETUlOX1RPS0VOIHx8IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiQURNSU5fVE9LRU5cIikgfHwgXCJcIlxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH1cbiAgICBpZiAoYWRtaW5IZWFkZXIpIGhlYWRlcnNbXCJ4LXVzZXItaWRcIl0gPSBTdHJpbmcoYWRtaW5IZWFkZXIpXG4gICAgaWYgKGFkbWluVG9rZW4pIGhlYWRlcnNbXCJ4LWFkbWluLXRva2VuXCJdID0gYWRtaW5Ub2tlblxuXG4gICAgc2V0QnVzeSh0cnVlKVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRlU3RyID1cbiAgICAgICAgdHlwZW9mIGRhdGVJc28gPT09IFwic3RyaW5nXCJcbiAgICAgICAgICA/IGRhdGVJc29cbiAgICAgICAgICA6IGRhdGVJc29cbiAgICAgICAgICA/IChkYXRlSXNvIGFzIERhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZyhcImVuLUNBXCIpXG4gICAgICAgICAgOiBudWxsO1xuXG4gICAgICBpZiAoaXNFZGl0KSB7XG4gICAgICAgIGNvbnN0IHJlY0lkID1cbiAgICAgICAgICAocmVjb3JkIGFzIGFueSk/LmlkIHx8XG4gICAgICAgICAgKHJlY29yZCBhcyBhbnkpPy5wYXJhbXM/LmlkIHx8XG4gICAgICAgICAgKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG0gPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL3JlY29yZHNcXC8oW14vXSspXFwvZWRpdC9pKVxuICAgICAgICAgICAgcmV0dXJuIG0gPyBtWzFdIDogbnVsbFxuICAgICAgICAgIH0pKClcbiAgICAgICAgaWYgKCFyZWNJZCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyByZWNvcmQgaWQgZm9yIGVkaXRcIilcbiAgICAgICAgY29uc3QgYmFzZSA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW5cbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYCR7YmFzZX0vYWRtaW4vYXBpL3B1enpsZS8ke3JlY0lkfWAsIHtcbiAgICAgICAgICBtZXRob2Q6IFwiUEFUQ0hcIixcbiAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBjb250ZW50OiBwYXJzZWQsXG4gICAgICAgICAgICBwdXp6bGVEYXRlOiBkYXRlU3RyLFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGxhbmd1YWdlLFxuICAgICAgICAgICAgc2xvdCxcbiAgICAgICAgICAgIGV4dGVybmFsSWQ6IGlkLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9KVxuICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzLmpzb24oKVxuICAgICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGJvZHk/LmVycm9yIHx8IFwiVXBkYXRlIGZhaWxlZFwiKVxuICAgICAgICBhbGVydChcIlVwZGF0ZWQgcHV6emxlIGNvbnRlbnRcIilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSB7IGlkLCBkYXRlOiBkYXRlU3RyLCB0eXBlLCBsYW5ndWFnZSwgc2xvdCwgY29udGVudDogcGFyc2VkIH1cbiAgICAgICAgY29uc3QgYmFzZSA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW5cbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYCR7YmFzZX0vYXBpL2ltcG9ydC1wdXp6bGVgLCB7XG4gICAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShbaXRlbV0pLFxuICAgICAgICB9KVxuICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzLmpzb24oKVxuICAgICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGJvZHk/LmVycm9yIHx8IFwiSW1wb3J0IGZhaWxlZFwiKVxuICAgICAgICBhbGVydChgSW1wb3J0ZWQgJHtib2R5LmltcG9ydGVkID8/IDB9IHB1enpsZShzKWApXG4gICAgICAgIHNldElkKFwiXCIpXG4gICAgICAgIHNldERhdGVJc28obnVsbClcbiAgICAgICAgc2V0SnNvbihcIlwiKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBhbGVydChlcnIubWVzc2FnZSB8fCBcIlNhdmUgZmFpbGVkXCIpXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldEJ1c3koZmFsc2UpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8Qm94IHZhcmlhbnQ9XCJ3aGl0ZVwiIHA9XCJ4bFwiIHN0eWxlPXt7IG1heFdpZHRoOiA5MDAgfX0+XG4gICAgICA8aDIgc3R5bGU9e3sgbWFyZ2luVG9wOiAwIH19Pntpc0VkaXQgPyBcIkVkaXQgUHV6emxlIENvbnRlbnRcIiA6IFwiQ3JlYXRlIFB1enpsZVwifTwvaDI+XG4gICAgICA8Qm94IGRpc3BsYXk9XCJncmlkXCIgZ3JpZFRlbXBsYXRlQ29sdW1ucz1cIjFmciAxZnJcIiBncmlkR2FwPVwiMTZweFwiIG1iPVwibGdcIj5cbiAgICAgICAgPEJveCBkaXNwbGF5PVwiZmxleFwiIGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIiBnYXA9XCI0cHhcIj5cbiAgICAgICAgICA8TGFiZWw+UHV6emxlIElEPC9MYWJlbD5cbiAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgIHZhbHVlPXtpZH1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0SWQoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJVbmlxdWUgcGVyIGxhbmd1YWdlXCJcbiAgICAgICAgICAgIHdpZHRoPVwiMTAwJVwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9Cb3g+XG4gICAgICAgIDxCb3ggZGlzcGxheT1cImZsZXhcIiBmbGV4RGlyZWN0aW9uPVwiY29sdW1uXCIgZ2FwPVwiNHB4XCI+XG4gICAgICAgICAgPExhYmVsPlB1enpsZSBEYXRlPC9MYWJlbD5cbiAgICAgICAgICA8RGF0ZVBpY2tlclxuICAgICAgICAgICAgdmFsdWU9e2RhdGVJc28gfHwgdW5kZWZpbmVkfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWwpID0+IHNldERhdGVJc28odmFsKX1cbiAgICAgICAgICAgIHByb3BlcnR5VHlwZT1cImRhdGVcIlxuICAgICAgICAgICAgcGxhY2Vob2xkZXJUZXh0PVwiWVlZWS1NTS1ERFwiXG4gICAgICAgICAgICBkYXRlRm9ybWF0PVwieXl5eS1NTS1kZFwiXG4gICAgICAgICAgICBzaG91bGRDbG9zZU9uU2VsZWN0XG4gICAgICAgICAgICBwb3BwZXJQbGFjZW1lbnQ9XCJib3R0b20tc3RhcnRcIlxuICAgICAgICAgICAgcmVuZGVyQ3VzdG9tSGVhZGVyPXsoe1xuICAgICAgICAgICAgICBkYXRlLFxuICAgICAgICAgICAgICBjaGFuZ2VZZWFyLFxuICAgICAgICAgICAgICBjaGFuZ2VNb250aCxcbiAgICAgICAgICAgICAgZGVjcmVhc2VNb250aCxcbiAgICAgICAgICAgICAgaW5jcmVhc2VNb250aCxcbiAgICAgICAgICAgIH0pID0+IChcbiAgICAgICAgICAgICAgPEJveCBkaXNwbGF5PVwiZmxleFwiIGFsaWduSXRlbXM9XCJjZW50ZXJcIiBqdXN0aWZ5Q29udGVudD1cInNwYWNlLWJldHdlZW5cIiBweD1cIm1kXCIgcHk9XCJzbVwiPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2RlY3JlYXNlTW9udGh9IHN0eWxlPXt7IGJhY2tncm91bmQ6IFwibm9uZVwiLCBib3JkZXI6IFwibm9uZVwiIH19PlxuICAgICAgICAgICAgICAgICAg4oC5XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPEJveCBkaXNwbGF5PVwiZmxleFwiIGdhcD1cIjhweFwiPlxuICAgICAgICAgICAgICAgICAgPFNlbGVjdFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17eyB2YWx1ZTogbW9udGhzW2RhdGUuZ2V0TW9udGgoKV0sIGxhYmVsOiBtb250aHNbZGF0ZS5nZXRNb250aCgpXSB9fVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KG9wdCkgPT4gY2hhbmdlTW9udGgobW9udGhzLmZpbmRJbmRleCgobSkgPT4gbSA9PT0gKG9wdCBhcyBhbnkpPy52YWx1ZSkpfVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zPXttb250aHMubWFwKChtKSA9PiAoeyB2YWx1ZTogbSwgbGFiZWw6IG0gfSkpfVxuICAgICAgICAgICAgICAgICAgICB2YXJpYW50PVwiZmlsdGVyXCJcbiAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8U2VsZWN0XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlPXt7IHZhbHVlOiBkYXRlLmdldEZ1bGxZZWFyKCksIGxhYmVsOiBTdHJpbmcoZGF0ZS5nZXRGdWxsWWVhcigpKSB9fVxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KG9wdCkgPT4gY2hhbmdlWWVhcihOdW1iZXIoKG9wdCBhcyBhbnkpPy52YWx1ZSkpfVxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zPXt5ZWFycy5tYXAoKHkpID0+ICh7IHZhbHVlOiB5LCBsYWJlbDogU3RyaW5nKHkpIH0pKX1cbiAgICAgICAgICAgICAgICAgICAgdmFyaWFudD1cImZpbHRlclwiXG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2luY3JlYXNlTW9udGh9IHN0eWxlPXt7IGJhY2tncm91bmQ6IFwibm9uZVwiLCBib3JkZXI6IFwibm9uZVwiIH19PlxuICAgICAgICAgICAgICAgICAg4oC6XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAvPlxuICAgICAgICA8L0JveD5cbiAgICAgICAgPEJveCBkaXNwbGF5PVwiZmxleFwiIGZsZXhEaXJlY3Rpb249XCJjb2x1bW5cIiBnYXA9XCI0cHhcIj5cbiAgICAgICAgICA8TGFiZWw+UHV6emxlIFR5cGU8L0xhYmVsPlxuICAgICAgICAgIDxTZWxlY3RcbiAgICAgICAgICAgIHZhbHVlPXtUWVBFUy5maW5kKChvKSA9PiBvLnZhbHVlID09PSB0eXBlKX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsob3B0KSA9PiBzZXRUeXBlKChvcHQgYXMgYW55KT8udmFsdWUgfHwgXCJjcm9zc3dvcmRcIil9XG4gICAgICAgICAgICBvcHRpb25zPXtUWVBFU31cbiAgICAgICAgICAgIHZhcmlhbnQ9XCJmaWx0ZXJcIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvQm94PlxuICAgICAgICA8Qm94IGRpc3BsYXk9XCJmbGV4XCIgZmxleERpcmVjdGlvbj1cImNvbHVtblwiIGdhcD1cIjRweFwiPlxuICAgICAgICAgIDxMYWJlbD5MYW5ndWFnZTwvTGFiZWw+XG4gICAgICAgICAgPFNlbGVjdFxuICAgICAgICAgICAgdmFsdWU9e0xBTkdTLmZpbmQoKG8pID0+IG8udmFsdWUgPT09IGxhbmd1YWdlKX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsob3B0KSA9PiBzZXRMYW5ndWFnZSgob3B0IGFzIGFueSk/LnZhbHVlIHx8IFwiZW5cIil9XG4gICAgICAgICAgICBvcHRpb25zPXtMQU5HU31cbiAgICAgICAgICAgIHZhcmlhbnQ9XCJmaWx0ZXJcIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvQm94PlxuICAgICAgICA8Qm94IGRpc3BsYXk9XCJmbGV4XCIgZmxleERpcmVjdGlvbj1cImNvbHVtblwiIGdhcD1cIjRweFwiPlxuICAgICAgICAgIDxMYWJlbD5TbG90PC9MYWJlbD5cbiAgICAgICAgICA8SW5wdXRcbiAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgICAgdmFsdWU9e3Nsb3R9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFNsb3QoTWF0aC5tYXgoMSwgTnVtYmVyKGUudGFyZ2V0LnZhbHVlKSB8fCAxKSl9XG4gICAgICAgICAgICBtaW49ezF9XG4gICAgICAgICAgICB3aWR0aD1cIjEwMCVcIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvQm94PlxuICAgICAgPC9Cb3g+XG5cbiAgICAgIDxUZXh0QXJlYVxuICAgICAgICBsYWJlbD1cIlB1enpsZSBKU09OXCJcbiAgICAgICAgcm93cz17MTh9XG4gICAgICAgIHdpZHRoPVwiMTAwJVwiXG4gICAgICAgIHZhbHVlPXtqc29ufVxuICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEpzb24oZS50YXJnZXQudmFsdWUpfVxuICAgICAgICBwbGFjZWhvbGRlcj1cIlBhc3RlIHB1enpsZSBKU09OICh3aXRob3V0IGlkL2RhdGUvbGFuZ3VhZ2UpXCJcbiAgICAgIC8+XG5cbiAgICAgIDxCdXR0b24gbXQ9XCJsZ1wiIHZhcmlhbnQ9XCJwcmltYXJ5XCIgb25DbGljaz17dXBsb2FkfSBkaXNhYmxlZD17YnVzeX0+XG4gICAgICAgIHtidXN5ID8gXCJTYXZpbmcuLi5cIiA6IFwiU2F2ZSBQdXp6bGVcIn1cbiAgICAgIDwvQnV0dG9uPlxuICAgIDwvQm94PlxuICApXG59XG5cbmV4cG9ydCBkZWZhdWx0IENyZWF0ZVB1enpsZUZvcm1cbiIsImltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCJcbmltcG9ydCB7IEFwaUNsaWVudCwgdXNlTm90aWNlIH0gZnJvbSBcImFkbWluanNcIlxuXG5jb25zdCBhcGkgPSBuZXcgQXBpQ2xpZW50KClcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRGFzaGJvYXJkKCkge1xuICBjb25zdCBbZGF0YSwgc2V0RGF0YV0gPSB1c2VTdGF0ZTxhbnk+KG51bGwpXG4gIGNvbnN0IGFkZE5vdGljZSA9IHVzZU5vdGljZSgpXG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBhcGkuZ2V0RGFzaGJvYXJkKClcbiAgICAgIC50aGVuKChyZXMpID0+IHNldERhdGEocmVzLmRhdGEpKVxuICAgICAgLmNhdGNoKCgpID0+IGFkZE5vdGljZSh7IG1lc3NhZ2U6IFwiRmFpbGVkIHRvIGxvYWQgc3RhdHNcIiwgdHlwZTogXCJlcnJvclwiIH0pKVxuICB9LCBbXSlcblxuICBjb25zdCBzdGF0Q2FyZCA9IChsYWJlbDogc3RyaW5nLCB2YWx1ZTogYW55KSA9PiAoXG4gICAgPGRpdlxuICAgICAgc3R5bGU9e3tcbiAgICAgICAgYm9yZGVyOiBcIjFweCBzb2xpZCAjZTVlN2ViXCIsXG4gICAgICAgIGJvcmRlclJhZGl1czogMTIsXG4gICAgICAgIHBhZGRpbmc6IFwiMjBweCAyNHB4XCIsXG4gICAgICAgIG1pbldpZHRoOiAyMjAsXG4gICAgICAgIG1pbkhlaWdodDogOTYsXG4gICAgICAgIGJhY2tncm91bmQ6IFwiI2ZmZlwiLFxuICAgICAgICBib3hTaGFkb3c6IFwiMCA4cHggMThweCByZ2JhKDE3LDI0LDM5LDAuMDYpXCIsXG4gICAgICAgIGRpc3BsYXk6IFwiZmxleFwiLFxuICAgICAgICBmbGV4RGlyZWN0aW9uOiBcImNvbHVtblwiLFxuICAgICAgICBqdXN0aWZ5Q29udGVudDogXCJjZW50ZXJcIixcbiAgICAgIH19XG4gICAgPlxuICAgICAgPGRpdiBzdHlsZT17eyBmb250U2l6ZTogMTIsIGNvbG9yOiBcIiM2YjcyODBcIiwgdGV4dFRyYW5zZm9ybTogXCJ1cHBlcmNhc2VcIiwgbGV0dGVyU3BhY2luZzogMC4zLCBtYXJnaW5Cb3R0b206IDYgfX0+XG4gICAgICAgIHtsYWJlbH1cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBzdHlsZT17eyBmb250U2l6ZTogMzIsIGZvbnRXZWlnaHQ6IDgwMCwgY29sb3I6IFwiI2Q2MDAwMFwiLCBsaW5lSGVpZ2h0OiAxLjEgfX0+e3ZhbHVlID8/IFwi4oCUXCJ9PC9kaXY+XG4gICAgPC9kaXY+XG4gIClcblxuICBjb25zdCBsYXN0ID0gZGF0YT8ubGFzdEF0dGVtcHRcblxuICByZXR1cm4gKFxuICAgIDxkaXYgc3R5bGU9e3sgcGFkZGluZzogMjQgfX0+XG4gICAgICA8aDEgc3R5bGU9e3sgZm9udFNpemU6IDI4LCBmb250V2VpZ2h0OiA4MDAsIG1hcmdpbkJvdHRvbTogMTIsIGNvbG9yOiBcIiMxMTE4MjdcIiB9fT5XZWxjb21lIHRvIEN5YmVyV29yZGFtZW50IFdhcmVob3VzZTwvaDE+XG4gICAgICA8cCBzdHlsZT17eyBjb2xvcjogXCIjNmI3MjgwXCIsIG1hcmdpbkJvdHRvbTogMjQgfX0+TGl2ZSBvcHMgc25hcHNob3QgZm9yIHB1enpsZXMgYW5kIHBsYXllcnMuPC9wPlxuXG4gICAgICA8ZGl2XG4gICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgZGlzcGxheTogXCJncmlkXCIsXG4gICAgICAgICAgZ2FwOiAxNixcbiAgICAgICAgICBncmlkVGVtcGxhdGVDb2x1bW5zOiBcInJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDIzMHB4LCAxZnIpKVwiLFxuICAgICAgICAgIG1hcmdpbkJvdHRvbTogMjQsXG4gICAgICAgIH19XG4gICAgICA+XG4gICAgICAgIHtzdGF0Q2FyZChcIkF0dGVtcHRzIHRvZGF5XCIsIGRhdGE/LmNvdW50cz8uYXR0ZW1wdHNfdG9kYXkpfVxuICAgICAgICB7c3RhdENhcmQoXCJBdHRlbXB0cyB0aGlzIHdlZWtcIiwgZGF0YT8uY291bnRzPy5hdHRlbXB0c193ZWVrKX1cbiAgICAgICAge3N0YXRDYXJkKFwiQXR0ZW1wdHMgYWxsIHRpbWVcIiwgZGF0YT8uY291bnRzPy5hdHRlbXB0c19hbGwpfVxuICAgICAgICB7c3RhdENhcmQoXCJBY3RpdmUgdXNlcnNcIiwgZGF0YT8udXNlcnM/LmFjdGl2ZV91c2Vycyl9XG4gICAgICAgIHtzdGF0Q2FyZChcIlRvdGFsIHVzZXJzXCIsIGRhdGE/LnVzZXJzPy50b3RhbF91c2Vycyl9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdlxuICAgICAgICBzdHlsZT17e1xuICAgICAgICAgIGJvcmRlcjogXCIxcHggc29saWQgI2U1ZTdlYlwiLFxuICAgICAgICAgIGJvcmRlclJhZGl1czogMTIsXG4gICAgICAgICAgcGFkZGluZzogXCIyMHB4IDI0cHhcIixcbiAgICAgICAgICBtaW5XaWR0aDogMjIwLFxuICAgICAgICAgIG1pbkhlaWdodDogOTYsXG4gICAgICAgICAgYmFja2dyb3VuZDogXCIjZmZmXCIsXG4gICAgICAgICAgYm94U2hhZG93OiBcIjAgOHB4IDE4cHggcmdiYSgxNywyNCwzOSwwLjA2KVwiLFxuICAgICAgICAgIGRpc3BsYXk6IFwiZmxleFwiLFxuICAgICAgICAgIGZsZXhEaXJlY3Rpb246IFwiY29sdW1uXCIsXG4gICAgICAgICAganVzdGlmeUNvbnRlbnQ6IFwiY2VudGVyXCIsXG4gICAgICAgIH19XG4gICAgICA+XG4gICAgICAgIDxkaXYgc3R5bGU9e3sgZm9udFNpemU6IDEyLCBjb2xvcjogXCIjNmI3MjgwXCIsIHRleHRUcmFuc2Zvcm06IFwidXBwZXJjYXNlXCIsIGxldHRlclNwYWNpbmc6IDAuMywgbWFyZ2luQm90dG9tOiA2IH19PlxuICAgICAgICAgIExhc3QgYXR0ZW1wdFxuICAgICAgICA8L2Rpdj5cbiAgICAgICAge2xhc3QgPyAoXG4gICAgICAgICAgPD5cbiAgICAgICAgICAgIDxkaXYgc3R5bGU9e3sgZm9udFNpemU6IDMyLCBmb250V2VpZ2h0OiA4MDAsIGNvbG9yOiBcIiNkNjAwMDBcIiwgbGluZUhlaWdodDogMS4xIH19PlxuICAgICAgICAgICAgICB7bGFzdC5uYW1lIHx8IFwiVW5rbm93blwifVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IHN0eWxlPXt7IGZvbnRTaXplOiAxMywgY29sb3I6IFwiIzZiNzI4MFwiLCBtYXJnaW5Ub3A6IDggfX0+XG4gICAgICAgICAgICAgIHtsYXN0LnJlZ2lvbiA/IGBSZWdpb246ICR7bGFzdC5yZWdpb259YCA6IFwiUmVnaW9uOiDigJRcIn1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBmb250U2l6ZTogMTMsIGNvbG9yOiBcIiM2YjcyODBcIiwgbWFyZ2luVG9wOiA0IH19PlxuICAgICAgICAgICAgICB7bGFzdC5jcmVhdGVkX2F0ID8gYFdoZW46ICR7bmV3IERhdGUobGFzdC5jcmVhdGVkX2F0KS50b0xvY2FsZVN0cmluZygpfWAgOiBcIldoZW46IOKAlFwifVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC8+XG4gICAgICAgICkgOiAoXG4gICAgICAgICAgPGRpdiBzdHlsZT17eyBmb250U2l6ZTogMTMsIGNvbG9yOiBcIiM2YjcyODBcIiB9fT5ObyBhdHRlbXB0cyB5ZXQuPC9kaXY+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKVxufVxuIiwiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiXG5pbXBvcnQgeyBCb3gsIEJ1dHRvbiwgRm9ybUdyb3VwLCBINSwgSW5wdXQsIExhYmVsLCBNZXNzYWdlQm94LCBUZXh0IH0gZnJvbSBcIkBhZG1pbmpzL2Rlc2lnbi1zeXN0ZW1cIlxuaW1wb3J0IHsgc3R5bGVkIH0gZnJvbSBcIkBhZG1pbmpzL2Rlc2lnbi1zeXN0ZW0vc3R5bGVkLWNvbXBvbmVudHNcIlxuXG5jb25zdCBXcmFwcGVyID0gc3R5bGVkKEJveClgXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBtaW4taGVpZ2h0OiAxMDAlO1xuYFxuXG5jb25zdCBTdHlsZWRMb2dvID0gc3R5bGVkLmltZ2BcbiAgbWF4LXdpZHRoOiAyNjBweDtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGRpc3BsYXk6IGJsb2NrO1xuYFxuXG5jb25zdCBIZWFkZXIgPSBzdHlsZWQuZGl2YFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIGZvbnQtc2l6ZTogMS41cmVtOyAvKiB+dGV4dC0yeGwgKi9cbiAgZm9udC13ZWlnaHQ6IDgwMDsgLyogZm9udC1leHRyYWJvbGQgKi9cbiAgY29sb3I6ICNkNjAwMDA7XG4gIG1hcmdpbi1ib3R0b206ICR7KHsgdGhlbWUgfSkgPT4gdGhlbWUuc3BhY2UubWR9O1xuYFxuXG5jb25zdCBMZXR0ZXJSb3cgPSBzdHlsZWQuZGl2YFxuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgZ2FwOiAycHg7XG4gIG1hcmdpbi1ib3R0b206ICR7KHsgdGhlbWUgfSkgPT4gdGhlbWUuc3BhY2UueGx9O1xuYFxuXG5jb25zdCBMZXR0ZXJCb3ggPSBzdHlsZWQuZGl2YFxuICBkaXNwbGF5OiBmbGV4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgaGVpZ2h0OiAyNHB4O1xuICB3aWR0aDogMThweDtcbiAgYm9yZGVyOiAxcHggc29saWQgI2Q2MDAwMDtcbiAgYm9yZGVyLXJhZGl1czogM3B4O1xuICBmb250LWZhbWlseTogXCJJQk0gUGxleCBNb25vXCIsIG1vbm9zcGFjZTtcbiAgZm9udC1zaXplOiAxMXB4O1xuICBmb250LXdlaWdodDogNzAwO1xuICBjb2xvcjogI2Q2MDAwMDtcbmBcblxuY29uc3QgUmVkQnV0dG9uID0gc3R5bGVkKEJ1dHRvbilgXG4gIGJhY2tncm91bmQtY29sb3I6ICNkNjAwMDAgIWltcG9ydGFudDtcbiAgYm9yZGVyLWNvbG9yOiAjZDYwMDAwICFpbXBvcnRhbnQ7XG4gICY6aG92ZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICNiMDAwMDAgIWltcG9ydGFudDtcbiAgICBib3JkZXItY29sb3I6ICNiMDAwMDAgIWltcG9ydGFudDtcbiAgfVxuYFxuXG5jb25zdCBSZXF1aXJlZExhYmVsID0gc3R5bGVkLmxhYmVsYFxuICBkaXNwbGF5OiBibG9jaztcbiAgZm9udC1zaXplOiAxNHB4O1xuICBmb250LXdlaWdodDogNTAwO1xuICBjb2xvcjogIzFmMjkzNztcbiAgbWFyZ2luLWJvdHRvbTogNHB4O1xuICAuYXN0ZXJpc2sge1xuICAgIGNvbG9yOiAjZDYwMDAwO1xuICAgIG1hcmdpbi1yaWdodDogNHB4O1xuICB9XG5gXG5cbi8vIEN1c3RvbSBsaWdodHdlaWdodCBsb2dpbiB3aXRob3V0IHRoZSBsZWZ0IGlsbHVzdHJhdGlvbiBvciBmb290ZXJcbmNvbnN0IEN1c3RvbUxvZ2luOiBSZWFjdC5GQyA9ICgpID0+IHtcbiAgY29uc3QgcHJvcHMgPSAod2luZG93IGFzIGFueSkuX19BUFBfU1RBVEVfX1xuICBjb25zdCB7IGFjdGlvbiwgZXJyb3JNZXNzYWdlOiBtZXNzYWdlLCBicmFuZGluZyB9ID0gcHJvcHNcblxuICByZXR1cm4gKFxuICAgIDxXcmFwcGVyIGZsZXggdmFyaWFudD1cImdyZXlcIiBjbGFzc05hbWU9XCJsb2dpbl9fV3JhcHBlclwiPlxuICAgICAgPEJveFxuICAgICAgICBhcz1cImZvcm1cIlxuICAgICAgICBhY3Rpb249e2FjdGlvbn1cbiAgICAgICAgbWV0aG9kPVwiUE9TVFwiXG4gICAgICAgIGJnPVwid2hpdGVcIlxuICAgICAgICBwPVwieDRcIlxuICAgICAgICBib3hTaGFkb3c9XCJsb2dpblwiXG4gICAgICAgIHdpZHRoPXtbXCIxMDAlXCIsIFwiNDgwcHhcIl19XG4gICAgICA+XG4gICAgICAgIDxIZWFkZXI+Q3liZXJXb3JkYW1lbnQgV2FyZUhvdXNlPC9IZWFkZXI+XG4gICAgICAgIDxMZXR0ZXJSb3c+XG4gICAgICAgICAge1wiQ1lCRVJXT1JEQU1FTlRcIi5zcGxpdChcIlwiKS5tYXAoKGxldHRlciwgaWR4KSA9PiAoXG4gICAgICAgICAgICA8TGV0dGVyQm94IGtleT17YCR7bGV0dGVyfS0ke2lkeH1gfT57bGV0dGVyfTwvTGV0dGVyQm94PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L0xldHRlclJvdz5cbiAgICAgICAgPEg1IG1hcmdpbkJvdHRvbT1cInh4bFwiIHRleHRBbGlnbj1cImNlbnRlclwiPlxuICAgICAgICAgIHticmFuZGluZz8ubG9nbyA/IDxTdHlsZWRMb2dvIHNyYz17YnJhbmRpbmcubG9nb30gYWx0PXticmFuZGluZy5jb21wYW55TmFtZX0gLz4gOiBicmFuZGluZz8uY29tcGFueU5hbWV9XG4gICAgICAgIDwvSDU+XG4gICAgICAgIHttZXNzYWdlICYmIChcbiAgICAgICAgICA8TWVzc2FnZUJveCBteT1cImxnXCIgbWVzc2FnZT17bWVzc2FnZX0gdmFyaWFudD1cImRhbmdlclwiIC8+XG4gICAgICAgICl9XG4gICAgICAgIDxGb3JtR3JvdXA+XG4gICAgICAgICAgPFJlcXVpcmVkTGFiZWw+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhc3Rlcmlza1wiPio8L3NwYW4+RW1haWxcbiAgICAgICAgICA8L1JlcXVpcmVkTGFiZWw+XG4gICAgICAgICAgPElucHV0IG5hbWU9XCJlbWFpbFwiIHBsYWNlaG9sZGVyPVwiRW1haWxcIiAvPlxuICAgICAgICA8L0Zvcm1Hcm91cD5cbiAgICAgICAgPEZvcm1Hcm91cD5cbiAgICAgICAgICA8UmVxdWlyZWRMYWJlbD5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImFzdGVyaXNrXCI+Kjwvc3Bhbj5QYXNzd29yZFxuICAgICAgICAgIDwvUmVxdWlyZWRMYWJlbD5cbiAgICAgICAgICA8SW5wdXQgdHlwZT1cInBhc3N3b3JkXCIgbmFtZT1cInBhc3N3b3JkXCIgcGxhY2Vob2xkZXI9XCJQYXNzd29yZFwiIGF1dG9Db21wbGV0ZT1cIm5ldy1wYXNzd29yZFwiIC8+XG4gICAgICAgIDwvRm9ybUdyb3VwPlxuICAgICAgICA8VGV4dCBtdD1cInhsXCIgdGV4dEFsaWduPVwiY2VudGVyXCI+XG4gICAgICAgICAgPFJlZEJ1dHRvbiB2YXJpYW50PVwiY29udGFpbmVkXCI+TG9naW48L1JlZEJ1dHRvbj5cbiAgICAgICAgPC9UZXh0PlxuICAgICAgPC9Cb3g+XG4gICAgPC9XcmFwcGVyPlxuICApXG59XG5cbmV4cG9ydCBkZWZhdWx0IEN1c3RvbUxvZ2luXG4iLCJBZG1pbkpTLlVzZXJDb21wb25lbnRzID0ge31cbmltcG9ydCBDcmVhdGVQdXp6bGVGb3JtIGZyb20gJy4uL3NyYy9hZG1pbi9jb21wb25lbnRzL2NyZWF0ZS1wdXp6bGUtZm9ybSdcbkFkbWluSlMuVXNlckNvbXBvbmVudHMuQ3JlYXRlUHV6emxlRm9ybSA9IENyZWF0ZVB1enpsZUZvcm1cbmltcG9ydCBEYXNoYm9hcmQgZnJvbSAnLi4vc3JjL2FkbWluL2NvbXBvbmVudHMvZGFzaGJvYXJkJ1xuQWRtaW5KUy5Vc2VyQ29tcG9uZW50cy5EYXNoYm9hcmQgPSBEYXNoYm9hcmRcbmltcG9ydCBMb2dpbiBmcm9tICcuLi9zcmMvYWRtaW4vY29tcG9uZW50cy9jdXN0b20tbG9naW4nXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLkxvZ2luID0gTG9naW4iXSwibmFtZXMiOlsiVFlQRVMiLCJ2YWx1ZSIsImxhYmVsIiwiTEFOR1MiLCJDcmVhdGVQdXp6bGVGb3JtIiwicmVjb3JkIiwiYWN0aW9uIiwiaXNFZGl0IiwibmFtZSIsImlkIiwic2V0SWQiLCJ1c2VTdGF0ZSIsImRhdGVJc28iLCJzZXREYXRlSXNvIiwidHlwZSIsInNldFR5cGUiLCJsYW5ndWFnZSIsInNldExhbmd1YWdlIiwic2xvdCIsInNldFNsb3QiLCJqc29uIiwic2V0SnNvbiIsImJ1c3kiLCJzZXRCdXN5IiwiY3VycmVudFllYXIiLCJEYXRlIiwiZ2V0RnVsbFllYXIiLCJ5ZWFycyIsIkFycmF5IiwiZnJvbSIsImxlbmd0aCIsIl8iLCJpIiwibW9udGhzIiwidXNlRWZmZWN0IiwibG9hZCIsInAiLCJwYXJhbXMiLCJyZWNJZCIsIm0iLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwibWF0Y2giLCJhZG1pbkhlYWRlciIsIkFETUlOX1VTRVJfSUQiLCJhZG1pblRva2VuIiwiQURNSU5fVE9LRU4iLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiaGVhZGVycyIsIlN0cmluZyIsImJhc2UiLCJvcmlnaW4iLCJkZXRhaWwiLCJyZXMiLCJmZXRjaCIsIm1ldGhvZCIsImNyZWRlbnRpYWxzIiwib2siLCJlcnIiLCJjb25zb2xlIiwid2FybiIsImJvZHkiLCJjb250ZW50VmFsIiwiY29udGVudCIsImxhbmdWYWwiLCJ0eXBlVmFsIiwidHlwZV9uYW1lIiwiZGF0ZVZhbCIsInB1enpsZV9kYXRlIiwiZGF0ZSIsImV4dElkIiwiZXh0ZXJuYWxfaWQiLCJleHRlcm5hbElkIiwic2xvdFZhbCIsInRvTG93ZXJDYXNlIiwiTnVtYmVyIiwidW5kZWZpbmVkIiwiSlNPTiIsInN0cmluZ2lmeSIsInVwbG9hZCIsImFsZXJ0IiwidHJpbSIsInBhcnNlZCIsInBhcnNlIiwiZGF0ZVN0ciIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIkVycm9yIiwicHV6emxlRGF0ZSIsImVycm9yIiwiaXRlbSIsImltcG9ydGVkIiwibWVzc2FnZSIsIlJlYWN0IiwiY3JlYXRlRWxlbWVudCIsIkJveCIsInZhcmlhbnQiLCJzdHlsZSIsIm1heFdpZHRoIiwibWFyZ2luVG9wIiwiZGlzcGxheSIsImdyaWRUZW1wbGF0ZUNvbHVtbnMiLCJncmlkR2FwIiwibWIiLCJmbGV4RGlyZWN0aW9uIiwiZ2FwIiwiTGFiZWwiLCJJbnB1dCIsIm9uQ2hhbmdlIiwiZSIsInRhcmdldCIsInBsYWNlaG9sZGVyIiwid2lkdGgiLCJEYXRlUGlja2VyIiwidmFsIiwicHJvcGVydHlUeXBlIiwicGxhY2Vob2xkZXJUZXh0IiwiZGF0ZUZvcm1hdCIsInNob3VsZENsb3NlT25TZWxlY3QiLCJwb3BwZXJQbGFjZW1lbnQiLCJyZW5kZXJDdXN0b21IZWFkZXIiLCJjaGFuZ2VZZWFyIiwiY2hhbmdlTW9udGgiLCJkZWNyZWFzZU1vbnRoIiwiaW5jcmVhc2VNb250aCIsImFsaWduSXRlbXMiLCJqdXN0aWZ5Q29udGVudCIsInB4IiwicHkiLCJvbkNsaWNrIiwiYmFja2dyb3VuZCIsImJvcmRlciIsIlNlbGVjdCIsImdldE1vbnRoIiwib3B0IiwiZmluZEluZGV4Iiwib3B0aW9ucyIsIm1hcCIsInkiLCJmaW5kIiwibyIsIk1hdGgiLCJtYXgiLCJtaW4iLCJUZXh0QXJlYSIsInJvd3MiLCJCdXR0b24iLCJtdCIsImRpc2FibGVkIiwiYXBpIiwiQXBpQ2xpZW50IiwiRGFzaGJvYXJkIiwiZGF0YSIsInNldERhdGEiLCJhZGROb3RpY2UiLCJ1c2VOb3RpY2UiLCJnZXREYXNoYm9hcmQiLCJ0aGVuIiwiY2F0Y2giLCJzdGF0Q2FyZCIsImJvcmRlclJhZGl1cyIsInBhZGRpbmciLCJtaW5XaWR0aCIsIm1pbkhlaWdodCIsImJveFNoYWRvdyIsImZvbnRTaXplIiwiY29sb3IiLCJ0ZXh0VHJhbnNmb3JtIiwibGV0dGVyU3BhY2luZyIsIm1hcmdpbkJvdHRvbSIsImZvbnRXZWlnaHQiLCJsaW5lSGVpZ2h0IiwibGFzdCIsImxhc3RBdHRlbXB0IiwiY291bnRzIiwiYXR0ZW1wdHNfdG9kYXkiLCJhdHRlbXB0c193ZWVrIiwiYXR0ZW1wdHNfYWxsIiwidXNlcnMiLCJhY3RpdmVfdXNlcnMiLCJ0b3RhbF91c2VycyIsIkZyYWdtZW50IiwicmVnaW9uIiwiY3JlYXRlZF9hdCIsInRvTG9jYWxlU3RyaW5nIiwiV3JhcHBlciIsInN0eWxlZCIsIlN0eWxlZExvZ28iLCJpbWciLCJIZWFkZXIiLCJkaXYiLCJ0aGVtZSIsInNwYWNlIiwibWQiLCJMZXR0ZXJSb3ciLCJ4bCIsIkxldHRlckJveCIsIlJlZEJ1dHRvbiIsIlJlcXVpcmVkTGFiZWwiLCJDdXN0b21Mb2dpbiIsInByb3BzIiwiX19BUFBfU1RBVEVfXyIsImVycm9yTWVzc2FnZSIsImJyYW5kaW5nIiwiZmxleCIsImNsYXNzTmFtZSIsImFzIiwiYmciLCJzcGxpdCIsImxldHRlciIsImlkeCIsImtleSIsIkg1IiwidGV4dEFsaWduIiwibG9nbyIsInNyYyIsImFsdCIsImNvbXBhbnlOYW1lIiwiTWVzc2FnZUJveCIsIm15IiwiRm9ybUdyb3VwIiwiYXV0b0NvbXBsZXRlIiwiVGV4dCIsIkFkbWluSlMiLCJVc2VyQ29tcG9uZW50cyIsIkxvZ2luIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0VBR0EsTUFBTUEsS0FBSyxHQUFHLENBQ1o7RUFBRUMsRUFBQUEsS0FBSyxFQUFFLFdBQVc7RUFBRUMsRUFBQUEsS0FBSyxFQUFFO0VBQVksQ0FBQyxFQUMxQztFQUFFRCxFQUFBQSxLQUFLLEVBQUUsWUFBWTtFQUFFQyxFQUFBQSxLQUFLLEVBQUU7RUFBYSxDQUFDLEVBQzVDO0VBQUVELEVBQUFBLEtBQUssRUFBRSxVQUFVO0VBQUVDLEVBQUFBLEtBQUssRUFBRTtFQUFXLENBQUMsQ0FDekM7RUFFRCxNQUFNQyxLQUFLLEdBQUcsQ0FDWjtFQUFFRixFQUFBQSxLQUFLLEVBQUUsSUFBSTtFQUFFQyxFQUFBQSxLQUFLLEVBQUU7RUFBVSxDQUFDLEVBQ2pDO0VBQUVELEVBQUFBLEtBQUssRUFBRSxJQUFJO0VBQUVDLEVBQUFBLEtB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
