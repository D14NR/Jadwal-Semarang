import type { CategoryConfig } from "../../types/app";

type SidebarMenuProps = {
  categories: CategoryConfig[];
  activeKey: string;
  sidebarCollapsed: boolean;
  onToggle: () => void;
  onSelect: (key: string) => void;
};

export function SidebarMenu({
  categories,
  activeKey,
  sidebarCollapsed,
  onToggle,
  onSelect,
}: SidebarMenuProps) {
  return (
    <aside className={`sidebar-kaiadmin ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-kaiadmin-inner">
        <div className="sidebar-brand-wrap">
          <div className="sidebar-brand-mark">
            <i className="bi bi-mortarboard" />
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-title">KBM-Qu</div>
            </div>
          )}
          <button
            type="button"
            className="btn btn-sm sidebar-kaiadmin-toggle"
            onClick={onToggle}
            aria-label={sidebarCollapsed ? "Perlebar menu" : "Perkecil menu"}
          >
            <i className={`bi ${sidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`} />
          </button>
        </div>

        {!sidebarCollapsed && <div className="sidebar-section-label">Main Menu</div>}

        <div className="sidebar-nav-list">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelect(category.key)}
              title={category.name}
              aria-label={category.name}
              className={`sidebar-nav-item ${sidebarCollapsed ? "justify-content-center" : "justify-content-start"} ${
                activeKey === category.key ? "active" : ""
              }`}
            >
              <span className="sidebar-nav-icon">
                <i className={`bi ${category.icon}`} />
              </span>
              <span className="sidebar-label">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}