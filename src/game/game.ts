import { Doc } from "yjs";
import { Nominal } from "../util/typing";
import { Scene, SceneId } from "./scene";
import { GameDir } from "../fs/fs";

/** A game which holds many scenes as subdocuments */
export type Game = Doc & Nominal<"Game">;

export type GameId = string & Nominal<"GameId"> & GameDir;

/** Constructs a new game */
export const new_game = () => new Doc() as Game;

/** Adds an existing scene to an existing game */
export const add_scene = (g: Game, s: Scene) => g.getMap().set(s.guid, s);

export const get_scene = (g: Game, s: SceneId) => g.getMap().get(s) as Scene;
