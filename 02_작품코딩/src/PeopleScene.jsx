import { useI18n } from "./i18n";
import { sceneArt } from "./scene-art.js";
import { useState } from "react";
import { Check } from "./icons";
import { sceneRegions } from "./scene-regions";

import { actionCues as rawCues, species as rawSpecies } from "./action-cues";
export default function PeopleScene({ scene, candidate, confirmed, pending, arriving, onPick }) {
  const { t, localize } = useI18n();
  const actionCues = localize(rawCues);
  const species = localize(rawSpecies);
  const [failed, setFailed] = useState(false);
  return <div className={`photo-scene living-scene ${failed ? "living-scene-unavailable" : ""} ${pending ? "scene-light-bloom" : ""}`} role="group" aria-label={t("{0}, 한 공간 속 다섯 바다 친구의 행동 중 하나를 선택하세요", scene.name)}>
    <img className="living-scene-art" src={sceneArt(scene.id)} alt={t("{0}. 같은 공간에서 {1}을 하는 다섯 해양생물.", scene.name, scene.actions.join(", "))} draggable="false" onError={() => setFailed(true)} />
    {!failed && <div className={`living-motion-layer ${pending ? "motion-paused" : ""}`} aria-hidden="true">{scene.options.map(([id],i)=>{const r=sceneRegions[scene.id][i];return <span key={id} className={`animal-breath animal-breath-${i}`} style={{left:`${r.x}%`,top:`${r.y}%`,width:`${r.w}%`,height:`${r.h}%`,backgroundImage:`url("${sceneArt(scene.id)}")`,backgroundSize:`${10000/r.w}% ${10000/r.h}%`,backgroundPosition:`${r.x/(100-r.w)*100}% ${r.y/(100-r.h)*100}%`,"--animal-delay":`${-i*.8}s`}}/>;})}</div>}
    <span className="living-scene-hint" aria-hidden="true">{t("어떤 행동이 나와 닮았나요?")}</span>
    {failed && <p className="living-scene-error" role="status">{t("장면을 불러오지 못했어요. 행동 이름을 눌러 선택할 수 있어요.")}</p>}
    {scene.options.map(([id], index) => {
      const selected = candidate === id;
      const region = sceneRegions[scene.id][index];
      return <button key={id} type="button" className={`scene-person photo-person living-person ${selected ? "person-active" : ""}`} style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.w}%`, height: `${region.h}%` }} data-testid={`actor-${id}`} aria-label={t("{0}번 {1}: {2}", index + 1, species[index], actionCues[scene.id][index])} aria-pressed={selected} disabled={pending || arriving} onClick={() => onPick(id)}>
        <span className="animal-aura" aria-hidden="true" />
        <span className="living-person-number" aria-hidden="true">{selected ? <Check size={17} /> : index + 1}</span>
        <span className="living-person-action" data-testid={`option-${id}`}><span>{species[index]}</span><strong>{actionCues[scene.id][index]}</strong>{confirmed === id && <Check size={14} aria-hidden="true" />}</span>
      </button>;
    })}
  </div>;
}
