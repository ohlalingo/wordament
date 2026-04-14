import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "nvarchar", length: "MAX" } as any)
  name!: string;

  @Column({ type: "nvarchar", length: 320, unique: true } as any)
  email!: string;

  @Column({ type: "nvarchar", length: "MAX", nullable: true } as any)
  region?: string;

  @Column({ type: "nvarchar", length: "MAX", nullable: true } as any)
  language?: string;

  @Column({
    type: "datetime2",
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

  @Column({ type: "nvarchar", length: 100, name: "type_name", unique: true } as any)
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

  @Column({ type: "nvarchar", length: 10, name: "language", default: "en" } as any)
  language!: string;

  @Column({ type: "nvarchar", length: "MAX", name: "external_id", nullable: true } as any)
  externalId?: string | null;

  @Column({ type: "int", name: "slot", default: 1 })
  slot!: number;

  // Stored as a JSON string in NVARCHAR(MAX)
  @Column({ type: "nvarchar", length: "MAX" } as any)
  content!: string;
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

  @Column({ type: "datetime2", nullable: true, name: "created_at" })
  createdAt?: Date;
}

@Entity("import_requests")
export class ImportRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "nvarchar", length: "MAX", nullable: true } as any)
  date?: string;

  @Column({ type: "nvarchar", length: "MAX", nullable: true, name: "crossword_json" } as any)
  crosswordJson?: string;

  @Column({ type: "nvarchar", length: "MAX", nullable: true, name: "wordsearch_json" } as any)
  wordsearchJson?: string;

  @Column({ type: "nvarchar", length: "MAX", nullable: true, name: "unjumble_json" } as any)
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
