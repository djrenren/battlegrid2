import { Branded } from "../util/string";

/** The type given to the file name for a given gamefile */
export type GameFile = Branded<"GameFile">;

/** The type given to the file name for a given gamefile */
export type GameDir = Branded<"GameFile">;

/** The type given to a resolveable path */
export type Path = [...GameDir[], GameFile];

const root = navigator.storage.getDirectory();

const resolve_dirs = async (dirs: GameDir[], options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle> => {
    let dir = await root;
    for (const d of dirs) {
        dir = await dir.getDirectoryHandle(d, options);
    }
    return dir;
}

const resolve_path = async (p: Path, options?: FileSystemGetFileOptions): Promise<FileSystemHandle> => {
    // We're guaranteed by the `Path` type that this pop will succeed and return a `GameFile`
    let file = p.pop() as GameFile; 
    let dir = await resolve_dirs(p, options);
    return dir.getFileHandle(file, options);
}

/** Creates a directory if it doesn't exist */
export const mkdirp = (p: [...GameDir[], string]) => resolve_dirs(p as Path, {create: true})