import { Doc } from "yjs";
import { GameDir, Path, mkdirp } from "../fs/fs";
import { Nominal } from "../util/typing";
import { TypedMap } from "../util/yjs";

/** A unique map and token configuration */
export type Scene = Doc &
  Nominal<"Scene"> & {
    guid: SceneId; // Refine the type from Y.js
    getMap(name: "map"): TypedMap<Map>;
  };

export const default_scene = () => {
  let scene = new Doc() as Scene;
  scene.getMap("map").set("background", "./img/map3.webp" as ResourceRef);
  scene.getMap("map").set("grid_dim", 1);
  scene.getMap("map").set("grid_offset_x", 0);
  scene.getMap("map").set("grid_offset_y", 0);
  return scene;
};

/** The unique identifier given to a game */
export type SceneId = string & Nominal<"SceneId"> & GameDir;

/** Contains data related the current map */
export type Map = {
  background: ResourceRef;
  grid_dim: number;
  grid_offset_x: number;
  grid_offset_y: number;
};

type ResourceRef = string & Nominal<"Resource">;
