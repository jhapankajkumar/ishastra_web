import React from 'react';
import styles from './PageToolbar.module.css';

/**
 * Shared page toolbar.
 *
 *   Title                                    [actions]
 *   ─────────────────────────────────────────────────
 *   Tab  Tab  Tab                            [scope]
 *
 * `tabs`  — view switch (Trading/Investment, Open/Closed …): [{ key, label, Icon?, count? }]
 * `scope` — data scope switch (currency/market):             [{ key, label, flag? }]
 * Both are optional; the rule under the title is drawn whenever either exists.
 */
export default function PageToolbar({
  title,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabChange,
  scope,
  activeScope,
  onScopeChange,
}) {
  const hasTabs = Array.isArray(tabs) && tabs.length > 0;
  const hasScope = Array.isArray(scope) && scope.length > 0;

  const scopeSwitch = hasScope && (
    <div className={styles.scope} role="group" aria-label="Scope">
      {scope.map(s => (
        <button
          key={s.key}
          type="button"
          className={`${styles.scopeBtn} ${activeScope === s.key ? styles.scopeBtnActive : ''}`}
          onClick={() => onScopeChange && onScopeChange(s.key)}
          aria-pressed={activeScope === s.key}
        >
          {s.flag && <span className={styles.scopeFlag}>{s.flag}</span>}
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.toolbar}>
      {(title || actions) && (
        <div className={styles.titleRow}>
          <div>
            {title && <h1 className={styles.title}>{title}</h1>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}

      {(hasTabs || hasScope) && (
        <div className={styles.bar}>
          {hasTabs ? (
            <nav className={styles.tabs} role="tablist">
              {tabs.map(t => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                    onClick={() => onTabChange && onTabChange(t.key)}
                  >
                    {t.Icon && <t.Icon className={styles.tabIcon} />}
                    {t.label}
                    {t.count != null && <span className={styles.tabCount}>{t.count}</span>}
                  </button>
                );
              })}
            </nav>
          ) : (
            // No tabs — scope takes the left slot so the rule isn't left empty.
            scopeSwitch
          )}
          {hasTabs && scopeSwitch}
        </div>
      )}
    </div>
  );
}
