import { useI18n } from "./i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, RotateCcw, Sparkles } from "./icons";
import { chests as rawChests, selectedOptions } from "./journey";
import ResultQR from "./ResultQR";
import TreasureArt from "./TreasureArt";
import Modal from "./Modal";

export default function Result({ answers, openChest, onNextVisitor, notify, shared = false }) {
  const { t, language, localize } = useI18n();
  const chests = localize(rawChests);
  const artworkRefs = useRef({});
  const [saving, setSaving] = useState(false);
  const [inspectId,setInspectId]=useState(null);
  const closeInspect=useCallback(()=>setInspectId(null),[]);
  useEffect(() => {
    document.querySelector(".result-heading h1")?.focus({ preventScroll: true });
  }, []);
  const groups = chests.map((chest) => ({ ...chest, options: localize(selectedOptions(chest, answers)) }));
  const collection=groups.flatMap(group=>group.options);
  const inspected=collection.find(option=>option.id===inspectId);
  const inspectionIndex=collection.findIndex(option=>option.id===inspectId);
  async function save() {
    setSaving(true);
    try {
      const { exportTreasureCard } = await import("./export");
      await exportTreasureCard(groups, artworkRefs.current, language);
      notify("나의 보물 결과지를 PNG로 저장했어요.");
    } catch (error) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="result-collection-content" inert={Boolean(inspected)} aria-hidden={inspected ? true : undefined}>
      <div className="page-heading result-heading">
        <div>
          <div className="eyebrow"><Sparkles size={13} /> YOUR SIX TREASURES</div>
          <h1 tabIndex="-1">{t("내가 발견한 여섯 가지 보물")}</h1>
          <p>{t("마음이 머문 여섯 번의 선택, 그 안에서 나만의 보물을 찾았어요.")}</p><p className="treasure-touch-hint">{t("보물을 터치해 크게 살펴보세요.")}</p>
        </div>
        <span className="complete-pill"><Check size={15} />{t("6개의 보물 획득 완료")}</span>
      </div>
      <div className={`results-body ${shared ? "is-shared" : ""}`}><div className="treasure-result-groups result-groups">
        {groups.map((group) => (
          <section className={`treasure-result-group ${group.theme}`} key={group.id} aria-labelledby={`result-${group.id}`}>
            <header className="treasure-group-heading">
              <span className="eyebrow">TREASURE {group.number}</span>
              <h2 id={`result-${group.id}`}>{group.name}</h2>
              {!shared && <button className="text-button" aria-label={t("{0} 선택 수정", group.name)} onClick={() => openChest(group, 0)}>{t("선택 돌아보기")}<ArrowRight size={14} /></button>}
            </header>
            <div className="treasure-result-cards">
              {group.options.map((option) => (
                <article className="treasure-result-card" key={option.id}>
                  <button className="treasure-inspect-button" aria-label={t("{0} 크게 보기",option.treasure.name)} aria-haspopup="dialog" onClick={()=>setInspectId(option.id)} data-testid={`inspect-${option.id}`} />
                  <span className="treasure-earned"><Check size={12} />{t("획득한 보물")}</span>
                  <TreasureArt option={option} theme={group.theme} imageRef={(node) => { artworkRefs.current[option.id] = node; }} />
                  <span className="treasure-choice-label">{option.label}</span>
                  <h3>{option.treasure.name}</h3>
                  <p className="treasure-selected-action"><span>{t("내가 선택한 행동")}: </span>{option.action}</p>
                  <p className="treasure-meaning">{option.treasure.description}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!shared && <ResultQR answers={answers} notify={notify} />}
      </div>
      <div className="treasure-result-actions">
        <p>{t("여섯 가지 보물, 오늘의 나에게 건네는 작은 발견.")}</p>
        <button className="button button-primary" disabled={saving} onClick={save}><Download size={17} />{saving ? t("결과지를 만들고 있어요…") : t("나의 보물 결과지 저장하기")}</button>
        {!shared && <button className="button button-gold next-visitor" onClick={onNextVisitor}><RotateCcw size={20} />{t("다음 관람객 시작")}</button>}
      </div>
      <p className="result-disclaimer">{t("지금의 선택을 돌아보는 자기 탐색 결과지입니다. 성격이나 능력을 진단하거나 점수로 평가하지 않아요.")}</p>
      </div>
      {inspected && <Modal eyebrow="YOUR TREASURE" title={inspected.treasure.name} onClose={closeInspect} wide><div className="treasure-inspection" data-testid="treasure-inspection"><TreasureArt option={inspected}/><div><span className="treasure-choice-label">{inspected.label}</span><p className="treasure-selected-action"><span>{t("내가 선택한 행동")}: </span>{inspected.action}</p><p>{inspected.treasure.description}</p><nav aria-label={t("여섯 보물 둘러보기")}><button className="button" onClick={()=>setInspectId(collection[(inspectionIndex+5)%6].id)}>{t("이전 보물")}</button><span>{inspectionIndex+1} / 6</span><button className="button button-gold" onClick={()=>setInspectId(collection[(inspectionIndex+1)%6].id)}>{t("다음 보물")}</button></nav></div></div></Modal>}
    </>
  );
}
