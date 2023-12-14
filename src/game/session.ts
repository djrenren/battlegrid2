import { WebrtcProvider } from "y-webrtc";
import { Game, get_scene } from "./game";
import { Scene, SceneId } from "./scene";
import { Awareness } from "y-protocols/awareness.js";

export type Session = RemoteSession | LocalSession;

interface SessionImpl {
  readonly awareness: Awareness;
  readonly game: Game;
  readonly scene?: Scene;
  readonly is_local: boolean;
}

export class RemoteSession extends WebrtcProvider implements SessionImpl {
  is_local: false = false;
  scene_id?: SceneId;

  get game() {
    return this.doc as Game;
  }

  get scene() {
    return this.scene_id ? get_scene(this.game, this.scene_id) : undefined;
  }
}

export class LocalSession implements SessionImpl {
  scene_id?: SceneId;
  game: Game;
  is_local: true = true;
  awareness: Awareness;

  constructor(game: Game) {
    this.game = game;
    this.awareness = new Awareness(this.game);
  }

  get scene() {
    return this.scene_id ? get_scene(this.game, this.scene_id) : undefined;
  }
}
