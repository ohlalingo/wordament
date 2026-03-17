import "reflect-metadata";
import AdminJS, { ComponentLoader } from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSTypeorm from "@adminjs/typeorm";
import { BaseEntity, DataSource } from "typeorm";
import { AllEntities, Attempt, Puzzle, PuzzleContent, PuzzleType, User, ImportRequest } from "./entities.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const { Database, Resource } = AdminJSTypeorm;
AdminJS.registerAdapter({ Database, Resource });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentLoader = new ComponentLoader();
const tsxComponentPath = path.join(__dirname, "components/create-puzzle-form.tsx");
const jsComponentPath = path.join(__dirname, "components/create-puzzle-form.js");
const createPuzzleComponentPath = fs.existsSync(jsComponentPath) ? jsComponentPath : tsxComponentPath;
const CREATE_PUZZLE_COMPONENT = componentLoader.add("CreatePuzzleForm", createPuzzleComponentPath);
const stripReservedFields = (content) => {
    if (content && typeof content === "object") {
        const clone = Array.isArray(content) ? [...content] : { ...content };
        delete clone.id;
        delete clone.date;
        delete clone.language;
        return clone;
    }
    return content;
};
export async function buildAdminRouter(dbUrlConfig) {
    const expressImport = await import("express");
    const expr = expressImport.default;
    const dataSource = new DataSource({
        type: "postgres",
        host: dbUrlConfig.host,
        port: dbUrlConfig.port,
        username: dbUrlConfig.user,
        password: dbUrlConfig.password,
        database: dbUrlConfig.database,
        entities: AllEntities,
        synchronize: false,
        logging: false,
    });
    if (!dataSource.isInitialized) {
        await dataSource.initialize();
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
  `);
    // add missing columns gracefully if table already existed without them
    await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS date varchar NULL;`);
    await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS crossword_json text NULL;`);
    await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS wordsearch_json text NULL;`);
    await dataSource.query(`ALTER TABLE import_requests ADD COLUMN IF NOT EXISTS unjumble_json text NULL;`);
    // ensure puzzle_content has language column and uniqueness per day/type/lang
    await dataSource.query(`ALTER TABLE puzzle_content ADD COLUMN IF NOT EXISTS language varchar DEFAULT 'en';`);
    await dataSource.query(`UPDATE puzzle_content SET language = 'en' WHERE language IS NULL;`);
    await dataSource.query(`UPDATE puzzle_content SET language = 'ja' WHERE LOWER(language) IN ('ja', 'japanese', 'jp', '日本語');`);
    await dataSource.query(`UPDATE puzzle_content SET language = 'en' WHERE LOWER(language) IN ('en', 'english');`);
    await dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzle_content_day_type_lang ON puzzle_content (puzzle_id, puzzle_type_id, language);`);
    await dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzle_types_type_name ON puzzle_types (type_name);`);
    await dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzles_date ON puzzles (puzzle_date);`);
    await dataSource.query(`ALTER TABLE puzzle_content ADD COLUMN IF NOT EXISTS external_id varchar NULL;`);
    BaseEntity.useDataSource(dataSource);
    const admin = new AdminJS({
        rootPath: "/admin",
        componentLoader,
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
                    properties: {
                        id: { label: "ID" },
                        puzzleId: { label: "Date", isVisible: { list: true, filter: true, show: true, edit: false } },
                        puzzleTypeId: { isVisible: { list: false, filter: false, show: false, edit: false } },
                        language: {
                            label: "Language",
                            isVisible: { list: true, filter: true, show: true, edit: true },
                            availableValues: [
                                { value: "en", label: "English" },
                                { value: "ja", label: "Japanese" },
                            ],
                            defaultValue: "en",
                        },
                        externalId: { label: "External Id" },
                        content: {
                            type: "textarea",
                            isVisible: { list: false, filter: false, show: false, edit: true },
                            props: {
                                placeholder: "Paste JSON for this puzzle type (crossword/wordsearch/unjumble). It will be saved directly to content.",
                            },
                        },
                        puzzle_date: {
                            isVisible: false,
                        },
                        type_name: { isVisible: false },
                    },
                    actions: {
                        new: { isVisible: false },
                        edit: { component: CREATE_PUZZLE_COMPONENT },
                        show: { isVisible: false },
                        createPuzzleForm: {
                            actionType: "resource",
                            label: "Create Puzzle",
                            icon: "Plus",
                            component: CREATE_PUZZLE_COMPONENT,
                            showFilter: false,
                            guard: null,
                            handler: async () => {
                                // UI posts directly to /api/import-puzzle
                                return {};
                            },
                        },
                    },
                },
            },
            { resource: Attempt, options: { parent: { name: "Attempts" } } },
            {
                resource: ImportRequest,
                options: { navigation: false },
            },
        ],
        pages: {},
    });
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "password123";
    const cookiePassword = process.env.ADMIN_COOKIE_SECRET || "super-secret-cookie";
    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
        authenticate: async (email, password) => {
            if (email === adminEmail && password === adminPassword) {
                return { email };
            }
            return null;
        },
        cookiePassword,
        cookieName: "adminjs",
    }, null, {
        resave: false,
        saveUninitialized: true,
        secret: cookiePassword,
    });
    const router = expr.Router();
    router.use(expr.json());
    router.use(adminRouter);
    return { admin, router };
}
