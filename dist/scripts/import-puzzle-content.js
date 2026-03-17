import "reflect-metadata";
import { readFileSync } from "fs";
import path from "path";
import { DataSource } from "typeorm";
import { Puzzle, PuzzleContent, PuzzleType, AllEntities, } from "../admin/entities.js";
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
const db = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "cyberwordament",
    entities: AllEntities,
    synchronize: false,
    logging: false,
});
async function main() {
    const fileArg = process.argv[2];
    if (!fileArg) {
        console.error("Usage: tsx src/scripts/import-puzzle-content.ts path/to/puzzles.json");
        process.exit(1);
    }
    const filePath = path.resolve(fileArg);
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const puzzles = Array.isArray(parsed) ? parsed : [parsed];
    await db.initialize();
    const puzzleRepo = db.getRepository(Puzzle);
    const puzzleTypeRepo = db.getRepository(PuzzleType);
    const puzzleContentRepo = db.getRepository(PuzzleContent);
    for (const src of puzzles) {
        let language = (src.language || "en").toLowerCase();
        if (language === "japanese" || language === "jp")
            language = "ja";
        if (language === "english")
            language = "en";
        const externalId = src.id ? String(src.id) : null;
        // find or create puzzle by date
        let puzzle = await puzzleRepo.findOne({ where: { puzzleDate: src.date } });
        if (!puzzle) {
            puzzle = puzzleRepo.create({ puzzleDate: src.date });
            puzzle = await puzzleRepo.save(puzzle);
            console.log(`Created puzzle for ${src.date} -> id ${puzzle.id}`);
        }
        // find or create puzzle type by name
        let puzzleType = await puzzleTypeRepo.findOne({ where: { typeName: src.type } });
        if (!puzzleType) {
            puzzleType = puzzleTypeRepo.create({ typeName: src.type });
            puzzleType = await puzzleTypeRepo.save(puzzleType);
            console.log(`Created puzzle type "${src.type}" -> id ${puzzleType.id}`);
        }
        // upsert puzzle_content for puzzle + type
        let contentRow = await puzzleContentRepo.findOne({
            where: { puzzleId: puzzle.id, puzzleTypeId: puzzleType.id, language },
        });
        const contentPayload = {
            ...stripReservedFields(src),
            sourceId: src.id ?? null,
        };
        if (contentRow) {
            contentRow.externalId = externalId;
            contentRow.content = contentPayload;
            await puzzleContentRepo.save(contentRow);
            console.log(`Updated puzzle_content (puzzle_id=${puzzle.id}, type_id=${puzzleType.id}, lang=${language})`);
        }
        else {
            contentRow = puzzleContentRepo.create({
                puzzleId: puzzle.id,
                puzzleTypeId: puzzleType.id,
                language,
                externalId,
                content: contentPayload,
            });
            await puzzleContentRepo.save(contentRow);
            console.log(`Inserted puzzle_content (puzzle_id=${puzzle.id}, type_id=${puzzleType.id}, lang=${language})`);
        }
    }
    await db.destroy();
    console.log("Import complete.");
}
main().catch((err) => {
    console.error(err);
    db.destroy().finally(() => process.exit(1));
});
