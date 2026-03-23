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
// __dirname at runtime is dist/admin; step back to repo root then frontend/public
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
    type: "postgres",
    host: dbUrlConfig.host,
    port: dbUrlConfig.port,
    username: dbUrlConfig.user,
    password: dbUrlConfig.password,
    database: dbUrlConfig.database,
    entities: AllEntities,
    synchronize: false,
    logging: true,
  })

  if (!dataSource.isInitialized) {
    await dataSource.initialize()
  }
  // ensure import_requests table exists for Import resource (synchronize is false)
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS import_requests (
      id serial PRIMARY KEY,
      date varchar NULL,
      crossword_json text NULL,
      wordsearch_json text NULL,
      unjumble_json text NULL
    );
  `)
  // add missing columns gracefully if table already existed without them
  await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS date varchar NULL;`)
  await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS crossword_json text NULL;`)
  await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS wordsearch_json text NULL;`)
  await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS unjumble_json text NULL;`)

  // ensure puzzle_content has language column and uniqueness per day/type/lang
  await dataSource.query(`ALTER TABLE puzzle_content ADD COLUMN IF NOT EXISTS language varchar DEFAULT 'en';`)
  await dataSource.query(`UPDATE puzzle_content SET language = 'en' WHERE language IS NULL;`)
  await dataSource.query(
    `UPDATE puzzle_content SET language = 'ja' WHERE LOWER(language) IN ('ja', 'japanese', 'jp', '日本語');`
  )
  await dataSource.query(`UPDATE puzzle_content SET language = 'en' WHERE LOWER(language) IN ('en', 'english');`)
  await dataSource.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzle_content_day_type_lang ON puzzle_content (puzzle_id, puzzle_type_id, language);`
  )
  await dataSource.query(`ALTER TABLE puzzle_content ADD COLUMN IF NOT EXISTS slot integer DEFAULT 1;`)
  await dataSource.query(`UPDATE puzzle_content SET slot = 1 WHERE slot IS NULL;`)
  await dataSource.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzle_content_day_type_lang_slot ON puzzle_content (puzzle_id, puzzle_type_id, language, slot);`
  )
  await dataSource.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzle_types_type_name ON puzzle_types (type_name);`
  )
  await dataSource.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzles_date ON puzzles (puzzle_date);`
  )
  await dataSource.query(`ALTER TABLE puzzle_content ADD COLUMN IF NOT EXISTS external_id varchar NULL;`)
  BaseEntity.useDataSource(dataSource)

  const admin = new AdminJS({
    rootPath: "/admin",
    componentLoader,
    version: {
      admin: true,
      app: `cw-prod-${Date.now()}`,
    },
    // non-standard prop to pass DS into action handler context
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

                  // normalize snake/camel so listProperties resolve
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

                  // ensure slot is present for list/edit hydration
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
              component: CREATE_PUZZLE_COMPONENT, // use the custom form for edit
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

                if (!cleanType) {
                  throw new Error("Invalid puzzle type")
                }

                if (typeof content === "string") {
                  try {
                    JSON.parse(content)
                  } catch {
                    throw new Error("Invalid JSON format")
                  }
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
                if (!puzzleType) {
                  throw new Error("Invalid puzzle type")
                }

                const normalizedSlot = Number(slot ?? 1) || 1
                // 3️⃣ Remove existing (avoid duplicates)
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
                    const user = await Attempt.getRepository().manager.query(
                      `SELECT name, email, region, language FROM users WHERE id = $1 LIMIT 1`,
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
                      `SELECT p.puzzle_date, pc.language
                       FROM puzzle_content pc
                       JOIN puzzles p ON p.id = pc.puzzle_id
                       WHERE pc.id = $1
                       LIMIT 1`,
                      [puzzleContentId]
                    )
                    if (pc?.[0]) {
                      params.puzzleDate = pc[0].puzzle_date
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
          const [lastAttempt] = await mgr.query(
            `SELECT pa.created_at, u.name, u.region
             FROM puzzle_attempts pa
             JOIN users u ON u.id = pa.user_id
             ORDER BY pa.created_at DESC NULLS LAST
             LIMIT 1`
          )
          const [counts] = await mgr.query(
            `SELECT
               COUNT(*) FILTER (WHERE p.puzzle_date = CURRENT_DATE) AS attempts_today,
               COUNT(*) FILTER (WHERE p.puzzle_date >= CURRENT_DATE - INTERVAL '6 days') AS attempts_week,
               COUNT(*) AS attempts_all
             FROM puzzle_attempts pa
             JOIN puzzle_content pc ON pc.id = pa.puzzle_content_id
             JOIN puzzles p ON p.id = pc.puzzle_id`
          )
          const [users] = await mgr.query(
            `SELECT
               COUNT(*) AS total_users,
               COUNT(DISTINCT user_id) AS active_users
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
