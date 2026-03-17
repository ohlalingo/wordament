var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
let User = class User extends BaseEntity {
    id;
    name;
    email;
    region;
    language;
    createdAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    Column({ type: "text" }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    Column({ type: "text", unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    Column({ type: "text", nullable: true }),
    __metadata("design:type", String)
], User.prototype, "region", void 0);
__decorate([
    Column({ type: "text", nullable: true }),
    __metadata("design:type", String)
], User.prototype, "language", void 0);
__decorate([
    Column({
        type: "timestamp",
        name: "created_at",
        nullable: true,
    }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
User = __decorate([
    Entity("users")
], User);
export { User };
let Puzzle = class Puzzle extends BaseEntity {
    id;
    puzzleDate;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Puzzle.prototype, "id", void 0);
__decorate([
    Column({ type: "date", unique: true, name: "puzzle_date" }),
    __metadata("design:type", String)
], Puzzle.prototype, "puzzleDate", void 0);
Puzzle = __decorate([
    Entity("puzzles")
], Puzzle);
export { Puzzle };
let PuzzleType = class PuzzleType extends BaseEntity {
    id;
    typeName;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], PuzzleType.prototype, "id", void 0);
__decorate([
    Column({ type: "varchar", name: "type_name", unique: true }),
    __metadata("design:type", String)
], PuzzleType.prototype, "typeName", void 0);
PuzzleType = __decorate([
    Entity("puzzle_types")
], PuzzleType);
export { PuzzleType };
let PuzzleContent = class PuzzleContent extends BaseEntity {
    id;
    puzzleId;
    puzzleTypeId;
    language;
    externalId;
    content;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], PuzzleContent.prototype, "id", void 0);
__decorate([
    Column({ type: "int", name: "puzzle_id" }),
    __metadata("design:type", Number)
], PuzzleContent.prototype, "puzzleId", void 0);
__decorate([
    Column({ type: "int", name: "puzzle_type_id" }),
    __metadata("design:type", Number)
], PuzzleContent.prototype, "puzzleTypeId", void 0);
__decorate([
    Column({ type: "varchar", name: "language", default: "en" }),
    __metadata("design:type", String)
], PuzzleContent.prototype, "language", void 0);
__decorate([
    Column({ type: "varchar", name: "external_id", nullable: true }),
    __metadata("design:type", String)
], PuzzleContent.prototype, "externalId", void 0);
__decorate([
    Column({ type: "jsonb" }),
    __metadata("design:type", Object)
], PuzzleContent.prototype, "content", void 0);
PuzzleContent = __decorate([
    Entity("puzzle_content")
], PuzzleContent);
export { PuzzleContent };
let Attempt = class Attempt extends BaseEntity {
    id;
    userId;
    puzzleContentId;
    correctWords;
    score;
    timeTaken;
    createdAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Attempt.prototype, "id", void 0);
__decorate([
    Column({ type: "int", name: "user_id" }),
    __metadata("design:type", Number)
], Attempt.prototype, "userId", void 0);
__decorate([
    Column({ type: "int", name: "puzzle_content_id" }),
    __metadata("design:type", Number)
], Attempt.prototype, "puzzleContentId", void 0);
__decorate([
    Column({ type: "int", name: "correct_words" }),
    __metadata("design:type", Number)
], Attempt.prototype, "correctWords", void 0);
__decorate([
    Column({ type: "int" }),
    __metadata("design:type", Number)
], Attempt.prototype, "score", void 0);
__decorate([
    Column({ type: "int", name: "time_taken" }),
    __metadata("design:type", Number)
], Attempt.prototype, "timeTaken", void 0);
__decorate([
    Column({ type: "timestamp", nullable: true, name: "created_at" }),
    __metadata("design:type", Date)
], Attempt.prototype, "createdAt", void 0);
Attempt = __decorate([
    Entity("puzzle_attempts")
], Attempt);
export { Attempt };
let ImportRequest = class ImportRequest extends BaseEntity {
    id;
    date;
    crosswordJson;
    wordsearchJson;
    unjumbleJson;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], ImportRequest.prototype, "id", void 0);
__decorate([
    Column({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], ImportRequest.prototype, "date", void 0);
__decorate([
    Column({ type: "text", nullable: true, name: "crossword_json" }),
    __metadata("design:type", String)
], ImportRequest.prototype, "crosswordJson", void 0);
__decorate([
    Column({ type: "text", nullable: true, name: "wordsearch_json" }),
    __metadata("design:type", String)
], ImportRequest.prototype, "wordsearchJson", void 0);
__decorate([
    Column({ type: "text", nullable: true, name: "unjumble_json" }),
    __metadata("design:type", String)
], ImportRequest.prototype, "unjumbleJson", void 0);
ImportRequest = __decorate([
    Entity("import_requests")
], ImportRequest);
export { ImportRequest };
export const AllEntities = [
    User,
    Puzzle,
    PuzzleType,
    PuzzleContent,
    Attempt,
    ImportRequest,
];
