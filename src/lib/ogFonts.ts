import { promises as fs } from "fs";
import path from "path";

type Font = { name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" };

let fontsPromise: Promise<Font[]> | null = null;

/** Satori needs raw font bytes; Korean glyphs come from the bundled Pretendard files. */
export function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all(
    ([["Regular", 400], ["Bold", 700], ["ExtraBold", 800]] as const).map(async ([file, weight]) => ({
      name: "Pretendard",
      data: await fs.readFile(path.join(process.cwd(), "src/assets/fonts", `Pretendard-${file}.otf`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fontsPromise;
}
