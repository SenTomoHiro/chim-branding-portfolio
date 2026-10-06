"use client";
import { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Business, CaseCategory } from "@/lib/types";

interface CategoryPillProps {
  business: Business;
  category?: CaseCategory;
}

export function CategoryPill({ business, category }: CategoryPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const currentLabel = category
    ? getCategoryLabel(category)
    : business === "branding"
    ? "品牌设计"
    : "商业摄影";

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = sheetRef.current;
    panel?.querySelector<HTMLButtonElement>(".isActive, button")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); }
      if (event.key === "Tab" && panel) {
        const buttons = [...panel.querySelectorAll<HTMLButtonElement>("button")];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const handleSelect = (newBusiness: Business, newCategory?: CaseCategory) => {
    setIsOpen(false);

    if (newCategory) {
      router.push(`/${newCategory}`);
    } else if (newBusiness === "photography") {
      router.push("/photo");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="categoryControl">
      <button ref={triggerRef} type="button" className="categoryPill" onClick={() => setIsOpen(!isOpen)} aria-label="选择分类" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={menuId}>
        <span className="pillLabel">{currentLabel}</span>
        <span className="pillIcon" />
      </button>

      {isOpen && createPortal(<div className="categorySheet isOpen">
        <div className="sheetBackdrop" onClick={() => setIsOpen(false)} />
        <div id={menuId} className="sheetContent" ref={sheetRef} role="dialog" aria-modal="true" aria-label="选择分类">
          <div className="sheetHeader">
            <h3>选择分类</h3>
            <button className="sheetClose" onClick={() => setIsOpen(false)} aria-label="关闭">
              ✕
            </button>
          </div>

          <div className="businessGroup">
            <h4 className="businessTitle">品牌设计</h4>
            <div className="categoryList">
              <button
                aria-pressed={business === "branding" && !category}
                className={`categoryOption ${business === "branding" && !category ? "isActive" : ""}`}
                onClick={() => handleSelect("branding")}
              >
                全部
              </button>
              <button
                aria-pressed={category === "food"}
                className={`categoryOption ${category === "food" ? "isActive" : ""}`}
                onClick={() => handleSelect("branding", "food")}
              >
                餐饮
              </button>
              <button
                aria-pressed={category === "drinks"}
                className={`categoryOption ${category === "drinks" ? "isActive" : ""}`}
                onClick={() => handleSelect("branding", "drinks")}
              >
                饮品
              </button>
              <button
                aria-pressed={category === "ip"}
                className={`categoryOption ${category === "ip" ? "isActive" : ""}`}
                onClick={() => handleSelect("branding", "ip")}
              >
                IP
              </button>
              <button
                aria-pressed={category === "other"}
                className={`categoryOption ${category === "other" ? "isActive" : ""}`}
                onClick={() => handleSelect("branding", "other")}
              >
                其他
              </button>
            </div>
          </div>

          <div className="businessGroup">
            <h4 className="businessTitle">商业摄影</h4>
            <div className="categoryList">
              <button
                aria-pressed={business === "photography"}
                className={`categoryOption ${business === "photography" ? "isActive" : ""}`}
                onClick={() => handleSelect("photography")}
              >
                全部作品
              </button>
            </div>
          </div>
        </div>
      </div>, document.body)}
    </div>
  );
}

function getCategoryLabel(category: CaseCategory): string {
  const labels: Record<CaseCategory, string> = {
    food: "餐饮",
    drinks: "饮品",
    ip: "IP",
    other: "其他",
  };
  return labels[category] || category;
}
