import { useI18n, LanguageSwitch } from "./i18n";
import { useEffect, useRef } from "react";
import { X } from "./icons";

export default function Modal({ title, onClose, children, wide = false, eyebrow = "A LITTLE GUIDANCE" }) {
  const { t } = useI18n();
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const nodes = [
        ...ref.current.querySelectorAll(
          'button:not(:disabled), a[href], input, [tabindex="0"]',
        ),
      ];
      const first = nodes[0];
      const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
      >
        <div className="modal-header">
          <LanguageSwitch />
          <span className="eyebrow">{eyebrow}</span>
          <button className="icon-button" aria-label={t("닫기")} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

