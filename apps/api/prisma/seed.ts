import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

type CsvRow = {
  순번?: string;
  이름?: string;
  동반인?: string;
};

const prisma = new PrismaClient();

function resolveCsvPath(): string {
  const candidates = [
    process.env.GUESTS_CSV_PATH,
    path.resolve(process.cwd(), "data/guests.csv"),
    path.resolve(process.cwd(), "../../guests.csv"),
    path.resolve(process.cwd(), "../../../guests.csv")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("guests.csv 파일을 찾을 수 없습니다. GUESTS_CSV_PATH를 지정하세요.");
}

function normalizeSeats(raw: string | undefined): number {
  const value = Number.parseInt((raw ?? "1").trim(), 10);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`동반인 값이 유효하지 않습니다: "${raw ?? ""}"`);
  }
  return value;
}

function normalizeSeq(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") {
    return null;
  }
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) ? value : null;
}

async function run(): Promise<void> {
  const csvPath = resolveCsvPath();
  const input = fs.readFileSync(csvPath, "utf8");
  const rows = parse(input, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  }) as CsvRow[];

  const dedup = new Map<string, { name: string; seq: number | null; seats: number }>();
  for (const row of rows) {
    const name = row["이름"]?.trim();
    if (!name) {
      continue;
    }
    if (dedup.has(name)) {
      throw new Error(`중복 이름이 발견되어 seed를 중단합니다: ${name}`);
    }
    dedup.set(name, {
      name,
      seq: normalizeSeq(row["순번"]),
      seats: normalizeSeats(row["동반인"])
    });
  }

  for (const guest of dedup.values()) {
    await prisma.guest.upsert({
      where: { name: guest.name },
      create: guest,
      update: {
        seq: guest.seq,
        seats: guest.seats
      }
    });
  }

  // 삭제 동기화는 의도적으로 하지 않는다.
  // 과거 RSVP 데이터 보존이 목적이다.
  console.log(`Seed complete: ${dedup.size} guests`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
