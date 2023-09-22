import { GameDir, Path, mkdirp } from "../fs/fs";
import { Branded } from "../util/string";
import { uuidv4 } from "../util/uuid";
import { TypedMap, typed_map } from "../util/yjs";

/** The unique identifier given to a game */
export type GameId = Branded<"GameId">;

/** The concrete type that all games have */
export type Game = TypedMap<{
  id: string;
  map: Map;
}>;

export const new_game = (old_state?: GameShape) =>
  typed_map({
    id: uuidv4(),
    map: {
      background: "./image/map3.webp",
      grid_dim: 1,
      grid_offset_x: 0,
      grid_offset_y: 0,
    },
    ...old_state,
  });

/** Gets the directory for the current game */
export const game_dir = (g: Game) => mkdirp([g.get("id")]);

/** The abstract shape of the game (stored in a Y.js Map as `Game`) */
type GameShape = {
  id: string;
  map: Map;
};

/** Contains data related the current map */
type Map = {
  background: ResourceRef;
  grid_dim: number;
  grid_offset_x: number;
  grid_offset_y: number;
};

type ResourceRef = Branded<"Resource">;
