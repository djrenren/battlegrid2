import { Branded } from "../util/string";

export const ASSET_DIR = "assets" as GameDir;

/** The type given to the file name for a given gamefile */
export type GameFile = Branded<"GameFile">;

/** The type given to the file name for a given gamefile */
export type GameDir = Branded<"GameDir">;

/** The type given to a resolveable path */
export type Path = [...GameDir[], GameFile];

const root = navigator.storage.getDirectory();

const resolve_dirs = async (
  dirs: GameDir[],
  options?: FileSystemGetDirectoryOptions,
): Promise<FileSystemDirectoryHandle> => {
  let dir = await root;
  for (const d of dirs) {
    dir = await dir.getDirectoryHandle(d, options);
  }
  return dir;
};

async function resolve_path(
  p: Path,
  options?: { create: true },
): Promise<FileSystemFileHandle>;
async function resolve_path(
  p: Path,
  options?: FileSystemGetFileOptions,
): Promise<FileSystemFileHandle | undefined> {
  // We're guaranteed by the `Path` type that this pop will succeed and return a `GameFile`
  let file = p.pop() as GameFile;
  try {
    let dir = await resolve_dirs(p as GameDir[], options);
    return dir.getFileHandle(file, options);
  } catch {}
}

/** Creates a directory if it doesn't exist */
export const mkdirp = (p: GameDir[]) => resolve_dirs(p, { create: true });

/** Read the file, returning undefined if it does not exist */
export const read = async (p: Path): Promise<ReadableStream | undefined> => {
  let file = (await resolve_path(p))?.getFile();
  if (file) return (await file).stream();
};

/** Create a writable stream that overwrites the contents of the file */
export const write = async (p: Path): Promise<WritableStream> =>
  (await resolve_path(p, { create: true })).createWritable();
