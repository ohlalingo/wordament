import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  region?: string;

  @Column({ type: "text", nullable: true })
  language?: string;

  @Column({
    type: "timestamp",
    name: "created_at",
    nullable: true,
  })
  createdAt?: Date;
}

@Entity("puzzles")
export class Puzzle extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "date", unique: true, name: "puzzle_date" })
  puzzleDate!: string;
}

@Entity("puzzle_types")
export class PuzzleType extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", name: "type_name", unique: true })
  typeName!: string;
}

@Entity("puzzle_content")
export class PuzzleContent extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", name: "puzzle_id" })
  puzzleId!: number;

@Column({ type: "int", name: "puzzle_type_id" })
  puzzleTypeId!: number;

  @Column({ type: "varchar", name: "language", default: "en" })
  language!: string;

  @Column({ type: "varchar", name: "external_id", nullable: true })
  externalId?: string | null;

  @Column({ type: "jsonb" })
  content!: Record<string, unknown>;
}

@Entity("puzzle_attempts")
export class Attempt extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", name: "user_id" })
  userId!: number;

  @Column({ type: "int", name: "puzzle_content_id" })
  puzzleContentId!: number;

  @Column({ type: "int", name: "correct_words" })
  correctWords!: number;

  @Column({ type: "int" })
  score!: number;

  @Column({ type: "int", name: "time_taken" })
  timeTaken!: number;

  @Column({ type: "timestamp", nullable: true, name: "created_at" })
  createdAt?: Date;
}

@Entity("import_requests")
export class ImportRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", nullable: true })
  date?: string;

  @Column({ type: "text", nullable: true, name: "crossword_json" })
  crosswordJson?: string;

  @Column({ type: "text", nullable: true, name: "wordsearch_json" })
  wordsearchJson?: string;

  @Column({ type: "text", nullable: true, name: "unjumble_json" })
  unjumbleJson?: string;
}

export const AllEntities = [
  User,
  Puzzle,
  PuzzleType,
  PuzzleContent,
  Attempt,
  ImportRequest,
];
