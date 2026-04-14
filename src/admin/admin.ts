import "reflect-metadata"

import AdminJS, { ComponentLoader } from "adminjs"
import AdminJSExpress from "@adminjs/express"
import * as AdminJSTypeorm from "@adminjs/typeorm"
import express from "express"

import { BaseEntity, DataSource } from "typeorm"
import { AllEntities, Attempt, Puzzle, PuzzleContent, PuzzleType, User, ImportRequest } from "./entities.js"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const { Database, Resource } = AdminJSTypeorm

AdminJS.registerAdapter({ Database, Resource })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const componentLoader = new ComponentLoader()
const tsxComponentPath = path.join(__dirname, "components/create-puzzle-form.tsx")
const jsComponentPath = path.join(__dirname, "components/create-puzzle-form.js")
const createPuzzleComponentPath = fs.existsSync(jsComponentPath) ? jsComponentPath : tsxComponentPath

const CREATE_PUZZLE_COMPONENT = componentLoader.add("CreatePuzzleForm", createPuzzleComponentPath)

const dashboardTsxPath = path.join(__dirname, "components/dashboard.tsx")
const dashboardJsPath = path.join(__dirname, "components/dashboard.js")
const dashboardComponentPath = fs.existsSync(dashboardJsPath) ? dashboardJsPath : dashboardTsxPath
const DASHBOARD_COMPONENT = componentLoader.add("Dashboard", dashboardComponentPath)

const customLoginTsxPath = path.join(__dirname, "components/custom-login.tsx")
const customLoginJsPath = path.join(__dirname, "components/custom-login.js")
const customLoginComponentPath = fs.existsSync(customLoginJsPath) ? customLoginJsPath : customLoginTsxPath
componentLoader.override("Login", customLoginComponentPath)

const cwFaviconPath = path.resolve(__dirname, "..", "..", "..", "frontend", "public", "cw-favicon.svg")
const CW_LOGO_DATA_URL = "data:image/svg+xml;base64," + fs.readFileSync(cwFaviconPath).toString("base64")

const ADMIN_LOGO_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="140" viewBox="0 0 420 140" fill="none">
      <rect width="420" height="140" fill="#ffffff"/>
      <text x="210" y="50" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="#d60000">CyberWordament WareHouse</text>
      <g transform="translate(30 70)" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="#d60000">
        ${"CYBERWORDAMENT"
          .split("")
          .map(
            (c, i) =>
              `<rect x="${i * 26}" y="0" width="24" height="24" rx="3" ry="3" fill="none" stroke="#d60000" stroke-width="1.2"/><text x="${i * 26 + 12}" y="16" text-anchor="middle">${c}</text>`
          )
          .join("")}
      </g>
    </svg>`
  )

const stripReservedFields = (content: any) => {
  if (content && typeof content === "object") {
    const clone = Array.isArray(content) ? [...content] : { ...content }
    delete (clone as any).id
    delete (clone as any).date
    delete (clone as any).language
    return clone
  }
  return content
}

export async function buildAdminRouter(dbUrlConfig: {
  host: string
  port: number
  user: string
  password: string
  database: string
}) {
  const expressImport = await import("express")
  const expr = expressImport.default
  const dataSource = new DataSource({
    type: "mssql",
    host: dbUrlConfig.host,
    port: dbUrlConfig.port || 1433,
    username: dbUrlConfig.user,
    password: dbUrlConfig.password,
    database: dbUrlConfig.database,
    entities: AllEntities,
    synchronize: false,
    logging: true,
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
    },
  })

  if (!dataSource.isInitialized) {
    await dataSource.initialize()
  }

  // ── Schema bootstrap (idempotent) ────────────────────────────────────────
  // Ensure import_requests table exists
  await dataSource.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'import_requests')
    BEGIN
      CREATE TABLE import_requests (
        id              INT           IDENTITY(1,1) PRIMARY KEY,
        date            NVARCHAR(MAX) NULL,
        crossword_json  NVARCHAR(MAX) NULL,
        wordsearch_json NVARCHAR(MAX) NULL,
        unjumble_json   NVARCHAR(MAX) NULL
      )
    END
  `)

  // Add any missing columns to import_requests
  for (const col of ["date", "crossword_json", "wordsearch_json", "unjumble_json"]) {
    await dataSource.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID(N'import_requests') AND name = N'${col}'
      )
      BEGIN
        ALTER TABLE import_requests ADD [${col}] NVARCHAR(MAX) NULL
      END
    `)
  }

  // Ensure puzzle_content.language column exists
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'puzzle_content') AND name = N'language'
    )
    BEGIN
      ALTER TABLE puzzle_content ADD language NVARCHAR(10) DEFAULT 'en'
    END
  `)
  await dataSource.query(`UPDATE puzzle_content SET language = 'en' WHERE language IS NULL`)
  await dataSource.query(`
    UPDATE puzzle_content
    SET language = 'ja'
    WHERE LOWER(language) IN ('ja', 'japanese', 'jp')
  `)
  await dataSource.query(`
    UPDATE puzzle_content
    SET language = 'en'
    WHERE LOWER(language) IN ('en', 'english')
  `)

  // Unique index: (puzzle_id, puzzle_type_id, language)
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = N'ux_puzzle_content_day_type_lang'
        AND object_id = OBJECT_ID(N'puzzle_content')
    )
    BEGIN
      CREATE UNIQUE INDEX ux_puzzle_content_day_type_lang
        ON puzzle_content (puzzle_id, puzzle_type_id, language)
    END
  `)

  // Ensure puzzle_content.slot column exists
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'puzzle_content') AND name = N'slot'
    )
    BEGIN
      ALTER TABLE puzzle_content ADD slot INT DEFAULT 1
    END
  `)
  await dataSource.query(`UPDATE puzzle_content SET slot = 1 WHERE slot IS NULL`)

  // Unique index: (puzzle_id, puzzle_type_id, language, slot)
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = N'ux_puzzle_content_day_type_lang_slot'
        AND object_id = OBJECT_ID(N'puzzle_content')
    )
    BEGIN
      CREATE UNIQUE INDEX ux_puzzle_content_day_type_lang_slot
        ON puzzle_content (puzzle_id, puzzle_type_id, language, slot)
    END
  `)

  // Unique index: puzzle_types (type_name)
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = N'ux_puzzle_types_type_name'
        AND object_id = OBJECT_ID(N'puzzle_types')
    )
    BEGIN
      CREATE UNIQUE INDEX ux_puzzle_types_type_name ON puzzle_types (type_name)
    END
  `)

  // Unique index: puzzles (puzzle_date)
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = N'ux_puzzles_date'
        AND object_id = OBJECT_ID(N'puzzles')
    )
    BEGIN
      CREATE UNIQUE INDEX ux_puzzles_date ON puzzles (puzzle_date)
    END
  `)

  // Ensure puzzle_content.external_id column exists
  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'puzzle_content') AND name = N'external_id'
    )
    BEGIN
      ALTER TABLE puzzle_content ADD external_id NVARCHAR(MAX) NULL
    END
  `)

  BaseEntity.useDataSource(dataSource)

  const admin = new AdminJS({
    rootPath: "/admin",
    componentLoader,
    version: {
      admin: true,
      app: `cw-prod-${Date.now()}`,
    },
    dataSource,
    branding: {
      companyName: "CyberWordament",
      favicon: CW_LOGO_DATA_URL,
      logo: ADMIN_LOGO_DATA_URL,
      softwareBrothers: false,
      withMadeWithLove: false,
      theme: {
        colors: {
          primary100: "#d60000",
          primary80: "#b80000",
          primary60: "#990000",
          primary40: "#7a0000",
          primary20: "#5c0000",
          accent: "#d60000",
        },
      },
    },
    locale: {
      translations: {
        en: {
          components: {
            Login: {
              welcomeHeader: "",
              welcomeMessage: "",
            },
          },
        },
      },
    },
    resources: [
      {
        resource: User,
        options: {
          parent: { name: "Users" },
          listProperties: ["email", "name", "region", "language", "createdAt"],
          properties: {
            id: { label: "User ID" },
            createdAt: { isVisible: { list: true, filter: true, show: true, edit: false } },
            role: { isVisible: false },
            region: { isRequired: false },
            language: {
              isRequired: false,
              availableValues: [
                { value: "en", label: "English" },
                { value: "ja", label: "Japanese" },
              ],
            },
          },
        },
      },
      { resource: Puzzle, options: { navigation: false } },
      { resource: PuzzleType, options: { navigation: false } },
      {
        resource: PuzzleContent,
        options: {
          parent: { name: "Puzzles" },
          listProperties: [
            "id",
            "external_id",
            "puzzle_id",
            "puzzle.puzzle_date",
            "type_name",
            "slot",
            "language",
          ],
          filterProperties: ["language"],
          sort: { sortBy: "id", direction: "desc" },
          properties: {
            id: {
              isVisible: { list: true, filter: false, show: true, edit: false },
              label: "Puzzle Content ID",
            },
            external_id: {
              label: "External ID",
              isVisible: { list: true, filter: false, show: true, edit: true },
            },
            externalId: { isVisible: false },
            puzzle_id: {
              label: "PuzzleDayID",
              isVisible: { list: true, filter: true, show: true, edit: false },
            },
            puzzleId: { isVisible: false },
            "puzzle.puzzle_date": {
              label: "Puzzle Date",
              isVisible: { list: true, filter: false, show: true, edit: false },
            },
            puzzle_type_id: {
              label: "Puzzle Type ID",
              isVisible: { list: false, filter: true, show: true, edit: false },
            },
            puzzleTypeId: { isVisible: { list: false, filter: false, show: false, edit: false } },
            type_name: {
              label: "Puzzle Type",
              isVisible: { list: true, filter: false, show: true, edit: false },
            },
            slot: {
              label: "Slot",
              type: "number",
              isVisible: { list: true, filter: true, show: true, edit: true },
              defaultValue: 1,
            },
            language: {
              label: "Language",
              isVisible: { list: true, filter: true, show: true, edit: true },
              availableValues: [
                { value: "en", label: "English" },
                { value: "ja", label: "Japanese" },
              ],
              defaultValue: "en",
            },
            content: {
              type: "textarea",
              isVisible: { list: false, filter: false, show: false, edit: true },
              props: {
                placeholder:
                  "Paste JSON for this puzzle type (crossword/wordsearch/unjumble). It will be saved directly to content.",
              },
            },
            puzzle_date: { isVisible: false },
          },
          actions: {
            list: {
              after: async (response) => {
                if (!response.records) return response

                for (const record of response.records) {
                  const params = { ...record.params }

                  if (params.externalId && !params.external_id) params.external_id = params.externalId
                  if (params.puzzleId && !params.puzzle_id) params.puzzle_id = params.puzzleId
                  if (params.puzzleTypeId && !params.puzzle_type_id) params.puzzle_type_id = params.puzzleTypeId

                  if (params.puzzleId) {
                    const puzzle = await dataSource.getRepository(Puzzle).findOneBy({ id: params.puzzleId })
                    if (puzzle) {
                      const d: any = (puzzle as any).puzzleDate ?? (puzzle as any).puzzle_date
                      params.puzzle_date =
                        typeof d === "string"
                          ? d
                          : d?.toISOString
                          ? d.toISOString().slice(0, 10)
                          : d
                      params["puzzle.puzzle_date"] = params.puzzle_date
                      params.puzzleDate = params.puzzle_date
                      params.puzzle_id = params.puzzleId
                    }
                  }

                  if (params.puzzleTypeId) {
                    const type = await dataSource.getRepository(PuzzleType).findOneBy({ id: params.puzzleTypeId })
                    if (type) {
                      params.type_name = (type as any).type_name ?? type.typeName
                      params.puzzle_type_id = params.puzzleTypeId
                    }
                  }

                  if (params.external_id && !params.externalId) {
                    params.externalId = params.external_id
                  }

                  if (params.slot === undefined && (record as any).params?.slot !== undefined) {
                    params.slot = (record as any).params.slot
                  }

                  record.params = params
                }

                return response
              },
            },
            new: { isVisible: false },
            edit: {
              isAccessible: true,
              component: CREATE_PUZZLE_COMPONENT,
              handler: async (request, response, context) => {
                if (request.method?.toLowerCase() === "get") {
                  const rec = context.record
                  return { record: rec?.toJSON ? rec.toJSON(context.currentAdmin) : rec?.params }
                }
                return context.resource._decorated!.actions.createPuzzleForm!.handler!(request, response, context)
              },
            },
            show: { isAccessible: true },
            createPuzzleForm: {
              actionType: "resource",
              label: "Create Puzzle",
              icon: "Plus",
              component: CREATE_PUZZLE_COMPONENT,
              showFilter: false,
              guard: null,
              handler: async (request, _response, context) => {
                const { dataSource } = context._admin.options as any
                const { puzzleDate, type, language, externalId, content, slot } = request.payload || {}

                if (!puzzleDate || !type || !content || !language) {
                  throw new Error("Missing required fields")
                }

                const cleanDateRaw =
                  puzzleDate instanceof Date
                    ? puzzleDate.toISOString().slice(0, 10)
                    : typeof puzzleDate === "string"
                    ? puzzleDate.trim()
                    : puzzleDate
                const cleanDate =
                  typeof cleanDateRaw === "string" && cleanDateRaw.includes("T")
                    ? cleanDateRaw.split("T")[0]
                    : cleanDateRaw
                const cleanType = typeof type === "string" ? type.trim().toLowerCase() : type
                const normalizedLang =
                  language === "Japanese"
                    ? "ja"
                    : language === "English"
                    ? "en"
                    : typeof language === "string"
                    ? language.trim().toLowerCase()
                    : language
                const normalizedExternalId =
                  typeof externalId === "string" && externalId.trim() ? externalId.trim() : null

                if (!cleanType) throw new Error("Invalid puzzle type")

                if (typeof content === "string") {
                  try { JSON.parse(content) } catch { throw new Error("Invalid JSON format") }
                }

                const finalContent =
                  typeof content === "string" ? content : JSON.stringify(stripReservedFields(content))

                console.log("[CREATE PUZZLE]", { date: cleanDate, type: cleanType, lang: normalizedLang })

                // 1️⃣ Find or create puzzle
                let puzzle = await dataSource.getRepository(Puzzle).findOne({ where: { puzzleDate: cleanDate } })
                if (!puzzle) {
                  puzzle = await dataSource.getRepository(Puzzle).save({ puzzleDate: cleanDate })
                }

                // 2️⃣ Get puzzle type
                const puzzleType = await dataSource.getRepository(PuzzleType).findOne({ where: { typeName: cleanType } })
                if (!puzzleType) throw new Error("Invalid puzzle type")

                const normalizedSlot = Number(slot ?? 1) || 1

                // 3️⃣ Delete existing to avoid unique-constraint conflict (no ON CONFLICT at ORM level)
                await dataSource.getRepository(PuzzleContent).delete({
                  puzzleId: puzzle.id,
                  puzzleTypeId: puzzleType.id,
                  language: normalizedLang,
                  slot: normalizedSlot,
                })

                // 4️⃣ Insert new content
                const saved = await dataSource.getRepository(PuzzleContent).save({
                  puzzleId: puzzle.id,
                  puzzleTypeId: puzzleType.id,
                  language: normalizedLang,
                  slot: normalizedSlot,
                  externalId: normalizedExternalId,
                  content: finalContent,
                })

                return {
                  record: { ...saved, externalId: normalizedExternalId, slot: normalizedSlot },
                  notice: { message: "Puzzle saved successfully", type: "success" },
                }
              },
            },
          },
        },
      },
      {
        resource: Attempt,
        options: {
          parent: { name: "Attempts" },
          listProperties: ["id", "userName", "userEmail", "puzzleDate", "language", "correctWords", "score", "timeTaken", "createdAt"],
          sort: { sortBy: "id", direction: "desc" },
          properties: {
            userName: { isVisible: { list: true, filter: false, show: true, edit: false } },
            userEmail: { isVisible: { list: true, filter: false, show: true, edit: false } },
            puzzleDate: { isVisible: { list: true, filter: false, show: true, edit: false } },
            language: { isVisible: { list: true, filter: true, show: true, edit: false } },
          },
          actions: {
            list: {
              after: async (response, _req, _ctx) => {
                if (!response.records) return response
                for (const record of response.records) {
                  const params = { ...record.params }
                  const userId = params.userId
                  const puzzleContentId = params.puzzleContentId
                  if (userId) {
                    // TypeORM mssql raw query: positional params are bound as @0, @1 ...
                    const user = await Attempt.getRepository().manager.query(
                      `SELECT TOP 1 name, email, region, language FROM users WHERE id = @0`,
                      [userId]
                    )
                    if (user?.[0]) {
                      params.userName = user[0].name
                      params.userEmail = user[0].email
                      params.language = params.language || user[0].language
                    }
                  }
                  if (puzzleContentId) {
                    const pc = await Attempt.getRepository().manager.query(
                      `SELECT TOP 1 p.puzzle_date, pc.language
                       FROM puzzle_content pc
                       JOIN puzzles p ON p.id = pc.puzzle_id
                       WHERE pc.id = @0`,
                      [puzzleContentId]
                    )
                    if (pc?.[0]) {
                      const d = pc[0].puzzle_date
                      params.puzzleDate =
                        d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
                      params.language = params.language || pc[0].language
                    }
                  }
                  record.params = params
                }
                return response
              },
            },
          },
        },
      },
      {
        resource: ImportRequest,
        options: { navigation: false },
      },
    ],
    dashboard: {
      component: DASHBOARD_COMPONENT,
      handler: async (_req, res) => {
        try {
          const mgr = dataSource.manager

          // TOP 1 instead of LIMIT 1; push NULLs last via CASE WHEN
          const [lastAttempt] = await mgr.query(
            `SELECT TOP 1 pa.created_at, u.name, u.region
             FROM puzzle_attempts pa
             JOIN users u ON u.id = pa.user_id
             ORDER BY CASE WHEN pa.created_at IS NULL THEN 1 ELSE 0 END, pa.created_at DESC`
          )

          // COUNT(CASE WHEN …) replaces Postgres FILTER(WHERE …)
          // CAST(GETUTCDATE() AS DATE) replaces CURRENT_DATE
          // DATEADD(day,-6,…) replaces INTERVAL '6 days'
          const [counts] = await mgr.query(
            `SELECT
               COUNT(CASE WHEN p.puzzle_date = CAST(GETUTCDATE() AS DATE) THEN 1 END)                       AS attempts_today,
               COUNT(CASE WHEN p.puzzle_date >= DATEADD(day,-6,CAST(GETUTCDATE() AS DATE)) THEN 1 END)      AS attempts_week,
               COUNT(*) AS attempts_all
             FROM puzzle_attempts pa
             JOIN puzzle_content pc ON pc.id = pa.puzzle_content_id
             JOIN puzzles p ON p.id = pc.puzzle_id`
          )

          const [users] = await mgr.query(
            `SELECT
               COUNT(*) AS total_users,
               COUNT(DISTINCT pa.user_id) AS active_users
             FROM users u
             LEFT JOIN puzzle_attempts pa ON pa.user_id = u.id`
          )

          res.json({
            lastAttempt: lastAttempt || null,
            counts: counts || { attempts_today: 0, attempts_week: 0, attempts_all: 0 },
            users: users || { total_users: 0, active_users: 0 },
          })
        } catch (e) {
          console.error("Dashboard stats error", e)
          res.json({})
        }
      },
    },
    pages: {},
  } as any)

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD || "password123"
  const cookiePassword = process.env.ADMIN_COOKIE_SECRET || "super-secret-cookie"

  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email, password) => {
        if (email === adminEmail && password === adminPassword) {
          return { email }
        }
        return null
      },
      cookiePassword,
      cookieName: "adminjs",
    },
    null,
    {
      resave: false,
      saveUninitialized: true,
      secret: cookiePassword,
    }
  )

  const router = expr.Router()
  router.use(expr.json())
  router.use(adminRouter)

  return { admin, router }
}
