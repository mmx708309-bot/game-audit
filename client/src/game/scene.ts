/** Babylon = المسرح الخلفي الهادئ؛ القصة والاختيارات تملكها طبقة واجهة منفصلة. */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.06, 0.14, 1);

  const camera = new ArcRotateCamera("stage-camera", -Math.PI / 2, Math.PI / 2.25, 18, new Vector3(0, 0, 0), scene);
  camera.lowerRadiusLimit = 18;
  camera.upperRadiusLimit = 18;
  camera.lowerBetaLimit = Math.PI / 2.25;
  camera.upperBetaLimit = Math.PI / 2.25;
  camera.attachControl(canvas, false);

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.55;
  ambient.diffuse = Color3.FromHexString("#8197C8");
  ambient.groundColor = Color3.FromHexString("#111A33");

  const spotlight = new PointLight("spotlight", new Vector3(0, 5, -4), scene);
  spotlight.intensity = 110;
  spotlight.diffuse = Color3.FromHexString("#F3B847");
  spotlight.range = 24;

  const stage = MeshBuilder.CreateBox("stage-floor", { width: 15, height: 0.7, depth: 4.6 }, scene);
  stage.position.y = -3.6;
  const stageMaterial = new StandardMaterial("stage-mat", scene);
  stageMaterial.diffuseColor = Color3.FromHexString("#3E2630");
  stageMaterial.emissiveColor = Color3.FromHexString("#130B17");
  stage.material = stageMaterial;

  const curtainMaterial = new StandardMaterial("curtain-mat", scene);
  curtainMaterial.diffuseColor = Color3.FromHexString("#D9483B");
  curtainMaterial.emissiveColor = Color3.FromHexString("#3A1016");

  const leftCurtain = MeshBuilder.CreateBox("left-curtain", { width: 1.5, height: 10, depth: 0.3 }, scene);
  leftCurtain.position = new Vector3(-8, 0.8, 1.6);
  leftCurtain.rotation.z = -0.13;
  leftCurtain.material = curtainMaterial;

  const rightCurtain = MeshBuilder.CreateBox("right-curtain", { width: 1.5, height: 10, depth: 0.3 }, scene);
  rightCurtain.position = new Vector3(8, 0.8, 1.6);
  rightCurtain.rotation.z = 0.13;
  rightCurtain.material = curtainMaterial;

  const bulbMaterial = new StandardMaterial("bulb-mat", scene);
  bulbMaterial.emissiveColor = Color3.FromHexString("#F3B847");
  bulbMaterial.diffuseColor = Color3.FromHexString("#F3B847");

  const bulbs = Array.from({ length: 13 }, (_, index) => {
    const bulb = MeshBuilder.CreateSphere(`bulb-${index}`, { diameter: 0.18, segments: 8 }, scene);
    bulb.position = new Vector3(-6.6 + index * 1.1, 3.8, 1.2);
    bulb.material = bulbMaterial;
    return bulb;
  });

  const stars = Array.from({ length: 28 }, (_, index) => {
    const star = MeshBuilder.CreateSphere(`star-${index}`, { diameter: 0.045 + (index % 3) * 0.025, segments: 6 }, scene);
    star.position = new Vector3(((index * 3.7) % 16) - 8, ((index * 2.1) % 9) - 3.5, 2.6 + (index % 4));
    star.material = bulbMaterial;
    return star;
  });

  scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;
    bulbs.forEach((bulb, index) => {
      bulb.scaling.setAll(0.82 + Math.sin(time * 2 + index * 0.9) * 0.14);
    });
    stars.forEach((star, index) => {
      star.position.y += Math.sin(time + index) * 0.0018;
      star.visibility = 0.36 + (Math.sin(time * 1.7 + index) + 1) * 0.25;
    });
  });

  return { scene, dispose: () => scene.dispose() };
}
