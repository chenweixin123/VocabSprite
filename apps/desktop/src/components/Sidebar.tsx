import type { Page } from '../state/model';
import { Icon } from './Icon';

const navigation: readonly {
  readonly page: Page;
  readonly icon: string;
  readonly label: string;
}[] = [
  { page: 'today', icon: '⌂', label: '今天' },
  { page: 'modules', icon: '▦', label: '学习模块' },
  { page: 'confusions', icon: '⌁', label: '易混图谱' },
  { page: 'library', icon: '◫', label: '词库' },
  { page: 'settings', icon: '⚙', label: '设置' },
];

interface SidebarProps {
  readonly page: Page;
  readonly onPage: (page: Page) => void;
  readonly onCompact: () => void;
}

export function Sidebar({ page, onPage, onCompact }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup sidebar-brand">
        <span className="sprite-mark">V</span>
        <div>
          <strong>VocabSprite</strong>
          <small>桌角单词精灵</small>
        </div>
      </div>
      <nav aria-label="主导航">
        {navigation.map((item) => (
          <button
            key={item.page}
            type="button"
            className={page === item.page ? 'nav-item active' : 'nav-item'}
            aria-current={page === item.page ? 'page' : undefined}
            onClick={() => onPage(item.page)}
          >
            <Icon>{item.icon}</Icon>
            <span>{item.label}</span>
            {item.page === 'confusions' && <small className="nav-badge">6</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="offline-badge">
        <span aria-hidden="true">●</span>
        <div>
          <strong>离线模式</strong>
          <small>数据仅在本机</small>
        </div>
      </div>
      <button className="compact-launch" type="button" onClick={onCompact}>
        <span className="sprite-dot" />
        显示桌角卡片 <span>↗</span>
      </button>
    </aside>
  );
}
