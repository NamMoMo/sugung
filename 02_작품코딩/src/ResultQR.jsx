import { useI18n } from "./i18n";
import { useEffect, useState } from "react";
import { resultURL } from "./result-link";

export default function ResultQR({ answers, notify }) {
  const { t, language } = useI18n();
  const url = resultURL(answers, window.location.href, language);
  const [qr, setQR] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setQR(""); setFailed(false);
    import("qrcode").then(module => (module.default || module).toDataURL(url, {
      width: 264, margin: 4, errorCorrectionLevel: "M", color: { dark: "#07121fff", light: "#ffffffff" },
    })).then(data => { if (active) setQR(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [url]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); notify("나의 결과지 링크를 복사했어요."); }
    catch { notify("아래 ‘내 결과지 열기’를 길게 눌러 링크를 복사해 주세요."); }
  }
  return <aside className="result-qr" aria-labelledby="qr-title">
    <div className="qr-picture">{qr ? <img src={qr} data-testid="result-qr" alt={t("내 여섯 보물 결과지를 휴대전화로 여는 QR 코드")} width="264" height="264" /> : <span role="status">{failed ? t("QR을 불러오지 못했어요. 아래 링크로 열 수 있어요.") : t("QR을 만들고 있어요…")}</span>}</div>
    <div><span className="eyebrow">TAKE YOUR TREASURES</span><h2 id="qr-title">{t("나의 여섯 보물을 휴대폰에 간직하세요")}</h2><p>{t("카메라로 QR을 비추면 내가 고른 여섯 보물 결과지가 열려요.")}<br />{t("휴대전화에서 ‘결과지 저장하기’를 눌러 간직해 주세요.")}</p><div className="qr-links"><a href={url} target="_blank" rel="noopener noreferrer" data-testid="result-share-link">{t("내 결과지 열기")}</a><button onClick={copy}>{t("결과 링크 복사")}</button></div><small>{t("다음 관람객이 체험해도 이 링크에는 나의 여섯 선택이 남아요.")}</small></div>
  </aside>;
}
